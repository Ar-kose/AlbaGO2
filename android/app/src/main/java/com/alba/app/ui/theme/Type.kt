package com.alba.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.googlefonts.Font
import androidx.compose.ui.text.googlefonts.GoogleFont
import androidx.compose.ui.unit.sp
import com.alba.app.R

private val fontProvider = GoogleFont.Provider(
    providerAuthority = "com.google.android.gms.fonts",
    providerPackage = "com.google.android.gms",
    certificates = R.array.com_google_android_gms_fonts_certs
)

private val SpaceGrotesk = GoogleFont("Space Grotesk")

val SpaceGroteskFamily = FontFamily(
    Font(googleFont = SpaceGrotesk, fontProvider = fontProvider, weight = FontWeight.Light),
    Font(googleFont = SpaceGrotesk, fontProvider = fontProvider, weight = FontWeight.Normal),
    Font(googleFont = SpaceGrotesk, fontProvider = fontProvider, weight = FontWeight.Medium),
    Font(googleFont = SpaceGrotesk, fontProvider = fontProvider, weight = FontWeight.SemiBold),
    Font(googleFont = SpaceGrotesk, fontProvider = fontProvider, weight = FontWeight.Bold),
)

val AlbaTypography = Typography(
    displayLarge = TextStyle(
        fontFamily = SpaceGroteskFamily,
        fontWeight = FontWeight.Bold,
        fontSize = 56.sp,
        letterSpacing = 0.sp
    ),
    headlineLarge = TextStyle(
        fontFamily = SpaceGroteskFamily,
        fontWeight = FontWeight.Bold,
        fontSize = 32.sp,
        letterSpacing = 0.sp
    ),
    headlineMedium = TextStyle(
        fontFamily = SpaceGroteskFamily,
        fontWeight = FontWeight.Bold,
        fontSize = 28.sp,
        letterSpacing = 0.sp
    ),
    headlineSmall = TextStyle(
        fontFamily = SpaceGroteskFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 24.sp
    ),
    titleLarge = TextStyle(
        fontFamily = SpaceGroteskFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 20.sp
    ),
    titleMedium = TextStyle(
        fontFamily = SpaceGroteskFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 16.sp
    ),
    bodyLarge = TextStyle(
        fontFamily = SpaceGroteskFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp
    ),
    bodyMedium = TextStyle(
        fontFamily = SpaceGroteskFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp
    ),
    bodySmall = TextStyle(
        fontFamily = SpaceGroteskFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp
    ),
    labelLarge = TextStyle(
        fontFamily = SpaceGroteskFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp
    ),
    labelMedium = TextStyle(
        fontFamily = SpaceGroteskFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 12.sp
    ),
    labelSmall = TextStyle(
        fontFamily = SpaceGroteskFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 10.sp,
        letterSpacing = 1.sp
    )
)
