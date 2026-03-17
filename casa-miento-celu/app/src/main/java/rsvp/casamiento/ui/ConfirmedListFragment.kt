package rsvp.casamiento.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.chip.Chip
import java.text.DateFormat
import java.util.Date
import java.util.Locale
import kotlinx.coroutines.launch
import rsvp.casamiento.R
import rsvp.casamiento.databinding.FragmentConfirmedListBinding
import rsvp.casamiento.ui.adapter.RsvpAdapter

class ConfirmedListFragment : Fragment() {

    private var _binding: FragmentConfirmedListBinding? = null
    private val binding get() = _binding!!
    private val viewModel: OrganizerViewModel by activityViewModels()
    private lateinit var adapter: RsvpAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentConfirmedListBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        adapter = RsvpAdapter()
        binding.rsvpRecycler.adapter = adapter
        binding.rsvpRecycler.layoutManager = LinearLayoutManager(requireContext())

        binding.refreshButton.setOnClickListener {
            viewModel.loadData()
        }

        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.uiState.collect { state ->
                    renderState(state)
                }
            }
        }
    }

    private fun renderState(state: OrganizerUiState) {
        binding.loadingProgress.isVisible = state.isLoading
        binding.refreshButton.isEnabled = !state.isLoading

        binding.countYes.text = state.yesCount.toString()
        binding.countNo.text = state.noCount.toString()
        binding.countTotal.text = state.totalPeople.toString()

        binding.lastSyncText.text = state.lastSyncEpochMs?.let { epoch ->
            val formatter = DateFormat.getDateTimeInstance(
                DateFormat.SHORT,
                DateFormat.SHORT,
                Locale.forLanguageTag("es-AR")
            )
            getString(R.string.last_sync, formatter.format(Date(epoch)))
        } ?: getString(R.string.no_sync_yet)

        binding.errorText.isVisible = !state.errorMessage.isNullOrBlank()
        binding.errorText.text = state.errorMessage

        binding.emptyText.isVisible = !state.isLoading && state.records.isEmpty()
        adapter.submitList(state.records)

        val menuCounts = viewModel.menuCounts(state.records)
        binding.menuChipGroup.removeAllViews()
        if (menuCounts.isEmpty()) {
            binding.menuChipGroup.isVisible = false
            binding.noMenuDataText.isVisible = true
        } else {
            binding.menuChipGroup.isVisible = true
            binding.noMenuDataText.isVisible = false
            menuCounts.forEach { (menu, count) ->
                binding.menuChipGroup.addView(
                    Chip(requireContext()).apply {
                        text = "$menu: $count"
                        isCheckable = false
                        isClickable = false
                    }
                )
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
