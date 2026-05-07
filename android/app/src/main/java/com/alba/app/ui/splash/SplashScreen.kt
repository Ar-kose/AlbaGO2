package com.alba.app.ui.splash

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.alba.app.R
import com.alba.app.ui.theme.AlbaColors
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(onFinished: () -> Unit) {
    var progress by remember { mutableFloatStateOf(0f) }
    val animatedProgress by animateFloatAsState(
        targetValue = progress,
        animationSpec = tween(2500, easing = FastOutSlowInEasing),
        label = "progress"
    )

    val logoAlpha by animateFloatAsState(
        targetValue = if (progress > 0f) 1f else 0f,
        animationSpec = tween(800, easing = FastOutSlowInEasing),
        label = "logoAlpha"
    )
    val logoScale by animateFloatAsState(
        targetValue = if (progress > 0f) 1f else 0.8f,
        animationSpec = tween(800, easing = FastOutSlowInEasing),
        label = "logoScale"
    )

    val infiniteTransition = rememberInfiniteTransition(label = "glow")
    val glowAlpha by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 0.6f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "glowPulse"
    )

    LaunchedEffect(Unit) {
        delay(300)
        progress = 1f
        delay(2800)
        onFinished()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(AlbaColors.BackgroundDark)
    ) {
        // Background radial glow effects
        Canvas(modifier = Modifier.fillMaxSize()) {
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        AlbaColors.Primary.copy(alpha = 0.12f * glowAlpha * 2),
                        Color.Transparent
                    ),
                    center = Offset(size.width * 0.2f, size.height * 0.15f),
                    radius = size.width * 0.6f
                ),
                radius = size.width * 0.6f,
                center = Offset(size.width * 0.2f, size.height * 0.15f)
            )
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        AlbaColors.Primary.copy(alpha = 0.06f * glowAlpha * 2),
                        Color.Transparent
                    ),
                    center = Offset(size.width * 0.8f, size.height * 0.85f),
                    radius = size.width * 0.7f
                ),
                radius = size.width * 0.7f,
                center = Offset(size.width * 0.8f, size.height * 0.85f)
            )
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 32.dp)
                .statusBarsPadding(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Spacer(modifier = Modifier.height(48.dp))

            // Logo section
            Column(
                modifier = Modifier
                    .alpha(logoAlpha)
                    .scale(logoScale),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Concentric circles + Logo icon
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier.padding(bottom = 32.dp)
                ) {
                    // Outer ring
                    Box(
                        modifier = Modifier
                            .size(160.dp)
                            .border(
                                1.dp,
                                AlbaColors.Primary.copy(alpha = 0.1f),
                                CircleShape
                            )
                    )
                    // Inner ring with pulse
                    Box(
                        modifier = Modifier
                            .size(128.dp)
                            .border(
                                2.dp,
                                AlbaColors.Primary.copy(alpha = glowAlpha),
                                CircleShape
                            )
                    )
                    // Glow behind logo
                    Box(
                        modifier = Modifier
                            .size(100.dp)
                            .background(
                                AlbaColors.Primary.copy(alpha = glowAlpha * 0.4f),
                                RoundedCornerShape(24.dp)
                            )
                            .blur(40.dp)
                    )
                    // Logo container
                    Box(
                        modifier = Modifier
                            .size(96.dp)
                            .background(
                                Brush.linearGradient(
                                    colors = listOf(
                                        AlbaColors.Primary,
                                        AlbaColors.Primary.copy(alpha = 0.6f)
                                    )
                                ),
                                RoundedCornerShape(24.dp)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            painter = painterResource(id = R.drawable.ic_bolt),
                            contentDescription = "AlbaGO Logo",
                            modifier = Modifier.size(48.dp),
                            tint = Color.White
                        )
                    }
                }

                // Brand name "AlbaGO"
                Text(
                    text = buildAnnotatedString {
                        withStyle(SpanStyle(color = AlbaColors.TextPrimary)) {
                            append("Alba")
                        }
                        withStyle(SpanStyle(color = AlbaColors.Primary)) {
                            append("GO")
                        }
                    },
                    fontSize = 56.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = (-2).sp
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Tagline pill
                Box(
                    modifier = Modifier
                        .border(
                            1.dp,
                            AlbaColors.Primary.copy(alpha = 0.2f),
                            RoundedCornerShape(999.dp)
                        )
                        .background(
                            AlbaColors.Primary.copy(alpha = 0.1f),
                            RoundedCornerShape(999.dp)
                        )
                        .padding(horizontal = 16.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = "HAREKET ET \u2022 OYNA \u2022 KE\u015eFET",
                        color = AlbaColors.Primary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        letterSpacing = 2.sp
                    )
                }
            }

            // Bottom section: progress + footer
            Column(
                modifier = Modifier.padding(bottom = 48.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(32.dp)
            ) {
                // Progress
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Bottom
                    ) {
                        Text(
                            text = "HAZIRLANIYOR",
                            color = AlbaColors.TextSecondary,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.SemiBold,
                            letterSpacing = 2.sp
                        )
                        Text(
                            text = "${(animatedProgress * 100).toInt()}%",
                            color = AlbaColors.Primary,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    // Progress bar
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .background(
                                AlbaColors.Primary.copy(alpha = 0.1f),
                                RoundedCornerShape(999.dp)
                            )
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth(animatedProgress)
                                .fillMaxHeight()
                                .background(
                                    AlbaColors.Primary,
                                    RoundedCornerShape(999.dp)
                                )
                        )
                    }
                }

                // Footer
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.alpha(0.5f)
                ) {
                    Text(
                        text = "PREMIUM MOTION EXPERIENCE",
                        color = AlbaColors.TextPrimary,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Medium,
                        letterSpacing = 2.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Box(
                        modifier = Modifier
                            .size(4.dp)
                            .background(AlbaColors.Primary, CircleShape)
                    )
                }
            }
        }
    }
}
