package rsvp.casamiento.ui.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.core.view.isVisible
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import java.util.Locale
import rsvp.casamiento.R
import rsvp.casamiento.databinding.ItemRsvpBinding
import rsvp.casamiento.model.RsvpRecord

class RsvpAdapter : ListAdapter<RsvpRecord, RsvpAdapter.RsvpViewHolder>(DiffCallback) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RsvpViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        val binding = ItemRsvpBinding.inflate(inflater, parent, false)
        return RsvpViewHolder(binding)
    }

    override fun onBindViewHolder(holder: RsvpViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    class RsvpViewHolder(
        private val binding: ItemRsvpBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(item: RsvpRecord) {
            binding.nameText.text = item.fullName.ifBlank { "Sin nombre" }
            binding.menuText.text = item.primaryMenu.replaceFirstChar { ch ->
                if (ch.isLowerCase()) ch.titlecase(Locale.forLanguageTag("es-AR")) else ch.toString()
            }

            if (item.attending) {
                binding.statusText.text = binding.root.context.getString(R.string.status_yes)
                binding.statusText.setTextColor(
                    ContextCompat.getColor(binding.root.context, R.color.status_yes)
                )
            } else {
                binding.statusText.text = binding.root.context.getString(R.string.status_no)
                binding.statusText.setTextColor(
                    ContextCompat.getColor(binding.root.context, R.color.status_no)
                )
            }

            val extras = item.extraGuests.joinToString(" | ") { guest ->
                val name = guest.name.ifBlank { "Invitado extra" }
                val menu = guest.menu?.trim().orEmpty()
                if (menu.isBlank()) name else "$name ($menu)"
            }

            binding.extrasText.isVisible = extras.isNotBlank()
            binding.extrasText.text = binding.root.context.getString(R.string.extra_guests, extras)
        }
    }

    private object DiffCallback : DiffUtil.ItemCallback<RsvpRecord>() {
        override fun areItemsTheSame(oldItem: RsvpRecord, newItem: RsvpRecord): Boolean =
            oldItem.id == newItem.id

        override fun areContentsTheSame(oldItem: RsvpRecord, newItem: RsvpRecord): Boolean =
            oldItem == newItem
    }
}
