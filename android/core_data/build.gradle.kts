plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.alba.core.data"
    compileSdk = 34

    defaultConfig {
        minSdk = 24
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation(project(":core_camera"))
    implementation(project(":core_pose"))
    implementation(project(":core_motion"))
    implementation(project(":core_runtime"))
    implementation(project(":core_network"))
    implementation("androidx.camera:camera-view:1.4.2")
    implementation("androidx.lifecycle:lifecycle-common:2.8.2")
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
}
