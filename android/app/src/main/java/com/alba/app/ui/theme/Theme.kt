package com.alba.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val AlbaDarkColorScheme = darkColorScheme(
    primary = AlbaColors.Primary,
    onPrimary = AlbaColors.TextPrimary,
    primaryContainer = AlbaColors.Primary.copy(alpha = 0.2f),
    onPrimaryContainer = AlbaColors.Primary,
    secondary = AlbaColors.Orange,
    onSecondary = AlbaColors.TextPrimary,
    background = AlbaColors.BackgroundDark,
    onBackground = AlbaColors.TextPrimary,
    surface = AlbaColors.SurfaceDark,
    onSurface = AlbaColors.TextPrimary,
    surfaceVariant = AlbaColors.SurfaceDark,
    onSurfaceVariant = AlbaColors.TextSecondary,
    outline = AlbaColors.TextMuted,
)

@Composable
fun AlbaTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = AlbaDarkColorScheme,
        typography = AlbaTypography,
        content = content
    )
}
