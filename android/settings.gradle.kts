pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
    plugins {
        id("com.android.application") version "8.4.2"
        id("com.android.library") version "8.4.2"
        id("org.jetbrains.kotlin.android") version "1.9.24"
        id("org.jetbrains.kotlin.kapt") version "1.9.24"
        id("com.google.dagger.hilt.android") version "2.51.1"
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "Alba"

include(
    ":app",
    ":core_camera",
    ":core_pose",
    ":core_motion",
    ":core_runtime",
    ":core_data",
    ":core_network",
    ":feature_workout",
    ":feature_games"
)
