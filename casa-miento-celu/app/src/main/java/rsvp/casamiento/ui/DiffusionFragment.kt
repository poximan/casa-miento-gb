package rsvp.casamiento.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.CompoundButton
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import kotlinx.coroutines.launch
import rsvp.casamiento.R
import rsvp.casamiento.databinding.FragmentDiffusionBinding

class DiffusionFragment : Fragment() {

    private var _binding: FragmentDiffusionBinding? = null
    private val binding get() = _binding!!
    private val viewModel: OrganizerViewModel by activityViewModels {
        (requireActivity() as rsvp.casamiento.MainActivity).viewModelFactory
    }
    private var lockCheckboxes = false

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentDiffusionBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.checkboxAll.isChecked = true

        val listener = CompoundButton.OnCheckedChangeListener { button, checked ->
            if (lockCheckboxes) return@OnCheckedChangeListener
            lockCheckboxes = true
            when (button.id) {
                R.id.checkbox_all -> if (checked) {
                    binding.checkboxYes.isChecked = false
                    binding.checkboxNo.isChecked = false
                }

                R.id.checkbox_yes, R.id.checkbox_no -> if (checked) {
                    binding.checkboxAll.isChecked = false
                }
            }

            if (!binding.checkboxAll.isChecked && !binding.checkboxYes.isChecked && !binding.checkboxNo.isChecked) {
                binding.checkboxAll.isChecked = true
            }
            lockCheckboxes = false
            updateRecipientsLabel()
        }

        binding.checkboxAll.setOnCheckedChangeListener(listener)
        binding.checkboxYes.setOnCheckedChangeListener(listener)
        binding.checkboxNo.setOnCheckedChangeListener(listener)

        binding.sendButton.setOnClickListener {
            val subject = binding.subjectEdit.text?.toString()?.trim().orEmpty()
            val body = binding.bodyEdit.text?.toString()?.trim().orEmpty()
            if (subject.isBlank()) {
                binding.subjectInputLayout.error = getString(R.string.required_field)
                return@setOnClickListener
            }
            binding.subjectInputLayout.error = null

            if (body.isBlank()) {
                binding.bodyInputLayout.error = getString(R.string.required_field)
                return@setOnClickListener
            }
            binding.bodyInputLayout.error = null

            viewModel.sendBroadcast(
                filter = currentFilter(),
                subject = subject,
                body = body
            )
        }

        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.uiState.collect { state ->
                    binding.sendingProgress.isVisible = state.isSendingEmail
                    binding.sendButton.isEnabled = !state.isSendingEmail && !state.authError
                    binding.sendResultText.isVisible = !state.sendMessage.isNullOrBlank()
                    binding.sendResultText.text = state.sendMessage
                    if (state.authError) {
                        binding.sendResultText.isVisible = true
                        binding.sendResultText.text = getString(R.string.session_expired)
                    }
                    updateRecipientsLabel()
                }
            }
        }
    }

    private fun currentFilter(): RecipientFilter {
        if (binding.checkboxAll.isChecked) return RecipientFilter.ALL
        if (binding.checkboxYes.isChecked && binding.checkboxNo.isChecked) return RecipientFilter.ALL
        if (binding.checkboxYes.isChecked) return RecipientFilter.YES
        if (binding.checkboxNo.isChecked) return RecipientFilter.NO
        return RecipientFilter.ALL
    }

    private fun updateRecipientsLabel() {
        val count = viewModel.recipientCountFor(currentFilter())
        binding.recipientsInfo.text = getString(R.string.recipient_count, count)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
        viewModel.clearSendMessage()
    }
}
