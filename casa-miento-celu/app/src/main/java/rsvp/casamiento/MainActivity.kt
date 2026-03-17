package rsvp.casamiento

import android.os.Bundle
import android.view.MotionEvent
import androidx.activity.addCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.GravityCompat
import androidx.drawerlayout.widget.DrawerLayout
import kotlin.math.abs
import kotlin.math.max
import rsvp.casamiento.databinding.ActivityMainBinding
import rsvp.casamiento.ui.ConfirmedListFragment
import rsvp.casamiento.ui.DiffusionFragment

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private var currentScreen: OrganizerScreen = OrganizerScreen.CONFIRMED
    private var swipeStartX = 0f
    private var swipeStartY = 0f
    private var globalSwipeHandled = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        improveDrawerSensitivity()
        setupEdgeZoneSwipe()

        if (savedInstanceState == null) {
            showScreen(OrganizerScreen.CONFIRMED)
        } else {
            currentScreen = if (supportFragmentManager.findFragmentById(R.id.fragment_container) is DiffusionFragment) {
                OrganizerScreen.DIFFUSION
            } else {
                OrganizerScreen.CONFIRMED
            }
            paintCurrentScreen()
        }

        binding.menuConfirmedButton.setOnClickListener {
            showScreen(OrganizerScreen.CONFIRMED)
            binding.drawerLayout.closeDrawer(GravityCompat.START)
        }

        binding.menuDiffusionButton.setOnClickListener {
            showScreen(OrganizerScreen.DIFFUSION)
            binding.drawerLayout.closeDrawer(GravityCompat.START)
        }

        binding.drawerHandle.setOnClickListener {
            binding.drawerLayout.openDrawer(GravityCompat.START)
        }

        binding.drawerLayout.addDrawerListener(object : DrawerLayout.SimpleDrawerListener() {
            override fun onDrawerSlide(drawerView: android.view.View, slideOffset: Float) {
                binding.drawerHandle.alpha = 1f - (slideOffset * 0.65f)
            }
        })

        onBackPressedDispatcher.addCallback(this) {
            when {
                binding.drawerLayout.isDrawerOpen(GravityCompat.START) ->
                    binding.drawerLayout.closeDrawer(GravityCompat.START)

                currentScreen != OrganizerScreen.CONFIRMED -> showScreen(OrganizerScreen.CONFIRMED)
                else -> this@MainActivity.finish()
            }
        }
    }

    override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
        handleGlobalSwipe(ev)
        return super.dispatchTouchEvent(ev)
    }

    private fun showScreen(screen: OrganizerScreen) {
        currentScreen = screen
        val fragment = when (screen) {
            OrganizerScreen.CONFIRMED -> ConfirmedListFragment()
            OrganizerScreen.DIFFUSION -> DiffusionFragment()
        }
        val title = when (screen) {
            OrganizerScreen.CONFIRMED -> getString(R.string.organizer_summary_title)
            OrganizerScreen.DIFFUSION -> getString(R.string.organizer_diffusion_title)
        }

        supportFragmentManager
            .beginTransaction()
            .replace(R.id.fragment_container, fragment)
            .commit()

        paintCurrentScreen(title)
    }

    private fun paintCurrentScreen(explicitTitle: String? = null) {
        val title = explicitTitle ?: when (currentScreen) {
            OrganizerScreen.CONFIRMED -> getString(R.string.organizer_summary_title)
            OrganizerScreen.DIFFUSION -> getString(R.string.organizer_diffusion_title)
        }
        supportActionBar?.title = title
        binding.menuConfirmedButton.isChecked = currentScreen == OrganizerScreen.CONFIRMED
        binding.menuDiffusionButton.isChecked = currentScreen == OrganizerScreen.DIFFUSION
    }

    private fun setupEdgeZoneSwipe() {
        var edgeStartX = 0f
        var edgeStartY = 0f
        val minDx = resources.displayMetrics.density * 28f

        binding.drawerEdgeZone.setOnTouchListener { _, event ->
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    edgeStartX = event.rawX
                    edgeStartY = event.rawY
                }

                MotionEvent.ACTION_MOVE -> {
                    val dx = event.rawX - edgeStartX
                    val dy = abs(event.rawY - edgeStartY)
                    if (dx >= minDx && dx > (dy * 1.8f)) {
                        binding.drawerLayout.openDrawer(GravityCompat.START)
                        return@setOnTouchListener true
                    }
                }
            }
            false
        }
    }

    private fun handleGlobalSwipe(event: MotionEvent) {
        if (!::binding.isInitialized) return
        if (binding.drawerLayout.isDrawerOpen(GravityCompat.START)) return

        val displayMetrics = resources.displayMetrics
        val minDx = displayMetrics.density * 78f
        val maxDy = displayMetrics.density * 38f
        val startLimitX = displayMetrics.widthPixels * 0.93f

        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                swipeStartX = event.rawX
                swipeStartY = event.rawY
                globalSwipeHandled = false
            }

            MotionEvent.ACTION_MOVE -> {
                if (globalSwipeHandled) return

                val dx = event.rawX - swipeStartX
                val dy = abs(event.rawY - swipeStartY)
                val validHorizontalSwipe = dx >= minDx && dy <= maxDy && dx > (dy * 1.9f)
                val validStart = swipeStartX <= startLimitX

                if (validStart && validHorizontalSwipe) {
                    binding.drawerLayout.openDrawer(GravityCompat.START)
                    globalSwipeHandled = true
                }
            }

            MotionEvent.ACTION_UP,
            MotionEvent.ACTION_CANCEL -> {
                globalSwipeHandled = false
            }
        }
    }

    private fun improveDrawerSensitivity() {
        val displayMetrics = resources.displayMetrics
        val targetEdge = max(
            (displayMetrics.widthPixels * 0.16f).toInt(),
            (displayMetrics.density * 40f).toInt()
        )

        runCatching {
            val leftDraggerField = DrawerLayout::class.java.getDeclaredField("mLeftDragger")
            leftDraggerField.isAccessible = true
            val leftDragger = leftDraggerField.get(binding.drawerLayout)

            val edgeSizeField = leftDragger.javaClass.getDeclaredField("mEdgeSize")
            edgeSizeField.isAccessible = true
            val currentEdge = edgeSizeField.getInt(leftDragger)
            if (targetEdge > currentEdge) {
                edgeSizeField.setInt(leftDragger, targetEdge)
            }
        }
    }

    private enum class OrganizerScreen {
        CONFIRMED,
        DIFFUSION
    }
}
