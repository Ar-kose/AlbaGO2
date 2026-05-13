package com.alba.app

import android.content.Context

class AppOnboardingStore(context: Context) {
    private val preferences = context.getSharedPreferences("albago_onboarding", Context.MODE_PRIVATE)

    var onboardingCompleted: Boolean
        get() = preferences.getBoolean(KEY_ONBOARDING_COMPLETED, false)
        set(value) = preferences.edit().putBoolean(KEY_ONBOARDING_COMPLETED, value).apply()

    var cameraPermissionEverRequested: Boolean
        get() = preferences.getBoolean(KEY_CAMERA_PERMISSION_EVER_REQUESTED, false)
        set(value) = preferences.edit().putBoolean(KEY_CAMERA_PERMISSION_EVER_REQUESTED, value).apply()

    fun reset() {
        preferences.edit().clear().apply()
    }

    private companion object {
        const val KEY_ONBOARDING_COMPLETED = "onboarding_completed"
        const val KEY_CAMERA_PERMISSION_EVER_REQUESTED = "camera_permission_ever_requested"
    }
}
