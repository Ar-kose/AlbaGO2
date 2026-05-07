plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.serialization")
}

android {
    namespace = "com.alba.core.network"
    compileSdk = 34

    defaultConfig {
        minSdk = 24
        buildConfigField("String", "SUPABASE_URL", "\"https://cszfdskmawqgjoxpkull.supabase.co\"")
        buildConfigField("String", "SUPABASE_ANON_KEY", "\"sb_publishable_LjR_DV-Ksp19GtwBNQCCvg_YX_iWoZA\"")
    }

    buildFeatures {
        buildConfig = true
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
    implementation(platform("io.github.jan-tennert.supabase:bom:3.5.0"))
    implementation("io.github.jan-tennert.supabase:postgrest-kt")
    implementation("io.github.jan-tennert.supabase:auth-kt")
    implementation("io.github.jan-tennert.supabase:storage-kt")
    implementation("io.github.jan-tennert.supabase:realtime-kt")
    implementation("io.ktor:ktor-client-cio:3.1.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
}
