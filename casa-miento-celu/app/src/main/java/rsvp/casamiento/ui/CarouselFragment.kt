package rsvp.casamiento.ui

import android.database.Cursor
import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.google.android.material.card.MaterialCardView
import com.google.android.material.checkbox.MaterialCheckBox
import com.google.android.material.chip.Chip
import java.net.URLConnection
import kotlinx.coroutines.launch
import rsvp.casamiento.R
import rsvp.casamiento.data.CloudinaryAsset
import rsvp.casamiento.data.CloudinaryRepository
import rsvp.casamiento.data.NeonRsvpRepository
import rsvp.casamiento.databinding.FragmentCarouselBinding

class CarouselFragment : Fragment() {

    private var _binding: FragmentCarouselBinding? = null
    private val binding get() = _binding!!
    private val cloudinaryRepository = CloudinaryRepository()
    private val neonRepository = NeonRsvpRepository()
    private val selectedPublicIds = linkedSetOf<String>()
    private var cloudAssets: List<CloudinaryAsset> = emptyList()

    private val pickerLauncher = registerForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) { uris ->
        if (uris.isNotEmpty()) {
            uploadUris(uris)
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentCarouselBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.refreshCarouselButton.setOnClickListener { loadData() }
        binding.uploadCarouselButton.setOnClickListener { pickerLauncher.launch(arrayOf("image/*")) }
        binding.publishCarouselButton.setOnClickListener { publishSelectedAssets() }
        binding.deleteCarouselButton.setOnClickListener { deleteSelectedAssets() }

        loadData()
    }

    private fun loadData() {
        setBusy(true)
        binding.carouselMessage.isVisible = false
        viewLifecycleOwner.lifecycleScope.launch {
            runCatching {
                val published = neonRepository.fetchPublishedCarouselUrls()
                val assets = cloudinaryRepository.listAssets()
                published to assets
            }.fold(
                onSuccess = { (published, assets) ->
                    cloudAssets = assets
                    renderPublishedUrls(published)
                    renderAssets(assets)
                    setBusy(false)
                },
                onFailure = { error ->
                    setBusy(false)
                    showMessage(error.message ?: getString(R.string.carousel_error_loading), true)
                }
            )
        }
    }

    private fun uploadUris(uris: List<Uri>) {
        setBusy(true)
        showMessage(getString(R.string.carousel_uploading), false)
        viewLifecycleOwner.lifecycleScope.launch {
            runCatching {
                uris.forEach { uri ->
                    val bytes = requireContext().contentResolver.openInputStream(uri)?.use { it.readBytes() }
                        ?: throw IllegalStateException(getString(R.string.carousel_error_upload))
                    val fileName = resolveFileName(uri)
                    val mimeType = requireContext().contentResolver.getType(uri)
                        ?: URLConnection.guessContentTypeFromName(fileName)
                        ?: "application/octet-stream"
                    cloudinaryRepository.uploadAsset(fileName, bytes, mimeType)
                }
            }.fold(
                onSuccess = {
                    showMessage(getString(R.string.carousel_upload_success), false)
                    loadData()
                },
                onFailure = { error ->
                    setBusy(false)
                    showMessage(error.message ?: getString(R.string.carousel_error_upload), true)
                }
            )
        }
    }

    private fun publishSelectedAssets() {
        val urls = cloudAssets
            .filter { selectedPublicIds.contains(it.publicId) }
            .map { it.url }
        if (urls.isEmpty()) {
            showMessage(getString(R.string.carousel_select_assets_first), true)
            return
        }

        setBusy(true)
        viewLifecycleOwner.lifecycleScope.launch {
            runCatching { neonRepository.publishCarouselUrls(urls) }.fold(
                onSuccess = {
                    showMessage(getString(R.string.carousel_publish_success, urls.size), false)
                    loadData()
                },
                onFailure = { error ->
                    setBusy(false)
                    showMessage(error.message ?: getString(R.string.carousel_error_publish), true)
                }
            )
        }
    }

    private fun deleteSelectedAssets() {
        val ids = selectedPublicIds.toList()
        if (ids.isEmpty()) {
            showMessage(getString(R.string.carousel_select_assets_first), true)
            return
        }
        setBusy(true)
        viewLifecycleOwner.lifecycleScope.launch {
            runCatching { cloudinaryRepository.deleteAssets(ids) }.fold(
                onSuccess = {
                    selectedPublicIds.clear()
                    showMessage(getString(R.string.carousel_delete_success, ids.size), false)
                    loadData()
                },
                onFailure = { error ->
                    setBusy(false)
                    showMessage(error.message ?: getString(R.string.carousel_error_delete), true)
                }
            )
        }
    }

    private fun renderPublishedUrls(urls: List<String>) {
        binding.publishedChipGroup.removeAllViews()
        binding.emptyPublishedText.isVisible = urls.isEmpty()
        urls.forEachIndexed { index, url ->
            binding.publishedChipGroup.addView(
                Chip(requireContext()).apply {
                    text = buildPublishedLabel(index, url)
                    isCheckable = false
                    isClickable = false
                    setChipBackgroundColorResource(R.color.action_primary_soft)
                    setTextColor(requireContext().getColor(R.color.text_primary))
                }
            )
        }
    }

    private fun renderAssets(assets: List<CloudinaryAsset>) {
        selectedPublicIds.retainAll(assets.map { it.publicId }.toSet())
        binding.assetContainer.removeAllViews()
        binding.emptyAssetsText.isVisible = assets.isEmpty()
        binding.selectedAssetsText.text = getString(R.string.carousel_selected_count, selectedPublicIds.size)

        assets.forEach { asset ->
            val container = MaterialCardView(requireContext()).apply {
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply {
                    bottomMargin = resources.getDimensionPixelSize(R.dimen.carousel_asset_spacing)
                }
                setCardBackgroundColor(requireContext().getColor(R.color.card_background))
                radius = resources.getDimension(R.dimen.carousel_asset_radius)
                strokeWidth = resources.getDimensionPixelSize(R.dimen.carousel_asset_stroke)
                strokeColor = requireContext().getColor(R.color.border_strong)
            }

            val column = LinearLayout(requireContext()).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(
                    resources.getDimensionPixelSize(R.dimen.carousel_asset_padding),
                    resources.getDimensionPixelSize(R.dimen.carousel_asset_padding),
                    resources.getDimensionPixelSize(R.dimen.carousel_asset_padding),
                    resources.getDimensionPixelSize(R.dimen.carousel_asset_padding)
                )
            }

            val checkBox = MaterialCheckBox(requireContext()).apply {
                text = asset.publicId
                setTextColor(requireContext().getColor(R.color.text_primary))
                isChecked = selectedPublicIds.contains(asset.publicId)
                setOnCheckedChangeListener { _, checked ->
                    if (checked) {
                        selectedPublicIds += asset.publicId
                    } else {
                        selectedPublicIds -= asset.publicId
                    }
                    binding.selectedAssetsText.text = getString(R.string.carousel_selected_count, selectedPublicIds.size)
                }
            }

            val urlText = TextView(requireContext()).apply {
                text = asset.url
                setTextColor(requireContext().getColor(R.color.text_muted))
                textSize = 12f
            }

            column.addView(checkBox)
            column.addView(urlText)
            container.addView(column)
            binding.assetContainer.addView(container)
        }
    }

    private fun setBusy(isBusy: Boolean) {
        binding.carouselProgress.isVisible = isBusy
        binding.refreshCarouselButton.isEnabled = !isBusy
        binding.uploadCarouselButton.isEnabled = !isBusy
        binding.publishCarouselButton.isEnabled = !isBusy
        binding.deleteCarouselButton.isEnabled = !isBusy
    }

    private fun showMessage(message: String, isError: Boolean) {
        binding.carouselMessage.isVisible = true
        binding.carouselMessage.text = message
        binding.carouselMessage.setTextColor(requireContext().getColor(if (isError) R.color.status_no else R.color.status_yes))
    }

    private fun resolveFileName(uri: Uri): String {
        val cursor: Cursor? = requireContext().contentResolver.query(uri, null, null, null, null)
        cursor?.use {
            val nameIndex = it.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (nameIndex >= 0 && it.moveToFirst()) {
                return it.getString(nameIndex).orEmpty().ifBlank { defaultUploadName() }
            }
        }
        return defaultUploadName()
    }

    private fun defaultUploadName(): String = "imagen_${System.currentTimeMillis()}.jpg"

    private fun buildPublishedLabel(index: Int, url: String): String {
        val tail = url.substringAfterLast('/').substringBefore('?').ifBlank { "imagen" }
        return "${index + 1}. $tail"
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
