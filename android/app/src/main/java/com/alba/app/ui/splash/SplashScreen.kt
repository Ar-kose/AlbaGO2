package com.alba.app.ui.splash

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.alba.app.R
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(onFinished: () -> Unit) {
    var progress by remember { mutableFloatStateOf(0f) }
    val animatedProgress by animateFloatAsState(
        targetValue = progress,
        animationSpec = tween(2300, easing = FastOutSlowInEasing),
        label = "splashProgress"
    )
    val logoScale by animateFloatAsState(
        targetValue = if (progress > 0f) 1f else 0.86f,
        animationSpec = tween(900, easing = FastOutSlowInEasing),
        label = "splashLogo"
    )

    LaunchedEffect(Unit) {
        delay(250)
        progress = 0.78f
        delay(2700)
        onFinished()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF05060E))
    ) {
        Image(
            painter = painterResource(id = R.drawable.background_neon_streaks),
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
            alpha = 0.58f
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        listOf(
                            Color.Black.copy(alpha = 0.30f),
                            Color(0xFF070915).copy(alpha = 0.76f),
                            Color.Black.copy(alpha = 0.95f)
                        )
                    )
                )
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .padding(horizontal = 32.dp, vertical = 34.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Spacer(modifier = Modifier.weight(0.42f))
            Image(
                painter = painterResource(id = R.drawable.logo_albago),
                contentDescription = "AlbaGO",
                modifier = Modifier
                    .fillMaxWidth(0.76f)
                    .scale(logoScale),
                contentScale = ContentScale.Fit
            )
            Text(
                text = "Hareket Et • Oyna • Keşfet",
                color = Color.White,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.sp,
                modifier = Modifier.padding(top = 8.dp)
            )
            Spacer(modifier = Modifier.height(28.dp))
            Image(
                painter = painterResource(id = R.drawable.splash_neon_a_logo),
                contentDescription = null,
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentScale = ContentScale.Fit
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "Yükleniyor...",
                color = Color.White.copy(alpha = 0.74f),
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium
            )
            Spacer(modifier = Modifier.height(18.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .border(
                        width = 1.dp,
                        color = Color(0xFFFF1593).copy(alpha = 0.72f),
                        shape = RoundedCornerShape(999.dp)
                    )
                    .background(Color.Black.copy(alpha = 0.28f), RoundedCornerShape(999.dp))
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(animatedProgress)
                        .fillMaxHeight()
                        .background(
                            Brush.horizontalGradient(listOf(Color(0xFFFF53B6), Color(0xFFFF1593))),
                            RoundedCornerShape(999.dp)
                        )
                )
            }
            Text(
                text = "${(animatedProgress * 100).toInt()}%",
                color = Color.White,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .align(Alignment.End)
                    .padding(top = 6.dp)
            )
            Spacer(modifier = Modifier.weight(0.18f))
        }
    }
}

