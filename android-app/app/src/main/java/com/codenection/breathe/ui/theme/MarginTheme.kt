package com.codenection.breathe.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.codenection.breathe.R

val Ink = Color(0xFF17221E)
val Forest = Color(0xFF0F6B4F)
val DeepForest = Color(0xFF173E32)
val Mint = Color(0xFFE6F2EC)
val SoftMint = Color(0xFFF0F6F2)
val Canvas = Color(0xFFF8F7F2)
val Paper = Color(0xFFFFFFFF)
val SurfaceMuted = Color(0xFFF0EEE7)
val OutlineSoft = Color(0xFFD8D8D2)
val OutlineStrong = Color(0xFF65716B)
val Coral = Color(0xFFD45F4E)
val CoralOnDark = Color(0xFFFFB4A8)
val SoftCoral = Color(0xFFF9E7E3)
val Amber = Color(0xFFC68A2E)
val Blue = Color(0xFF4E73B8)
val Violet = Color(0xFF6F67B6)
val TextMuted = Color(0xFF65716B)

val IbmPlexSans = FontFamily(
    Font(R.font.ibm_plex_sans_regular, FontWeight.Normal),
    Font(R.font.ibm_plex_sans_medium, FontWeight.Medium),
    Font(R.font.ibm_plex_sans_semibold, FontWeight.SemiBold),
    Font(R.font.ibm_plex_sans_bold, FontWeight.Bold),
)

private val MarginColors = lightColorScheme(
    primary = Forest,
    onPrimary = Color.White,
    primaryContainer = Mint,
    onPrimaryContainer = Ink,
    secondary = Violet,
    tertiary = Amber,
    error = Coral,
    errorContainer = SoftCoral,
    onErrorContainer = Ink,
    background = Canvas,
    onBackground = Ink,
    surface = Paper,
    onSurface = Ink,
    surfaceVariant = SurfaceMuted,
    onSurfaceVariant = TextMuted,
    outline = OutlineStrong,
    outlineVariant = OutlineSoft,
)

private val MarginTypography = Typography(
    headlineLarge = TextStyle(
        fontFamily = IbmPlexSans,
        fontWeight = FontWeight.Bold,
        fontSize = 36.sp,
        lineHeight = 39.sp,
        letterSpacing = (-0.7).sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = IbmPlexSans,
        fontWeight = FontWeight.Bold,
        fontSize = 28.sp,
        lineHeight = 32.sp,
        letterSpacing = (-0.55).sp,
    ),
    titleLarge = TextStyle(
        fontFamily = IbmPlexSans,
        fontWeight = FontWeight.Bold,
        fontSize = 21.sp,
        lineHeight = 27.sp,
    ),
    titleMedium = TextStyle(
        fontFamily = IbmPlexSans,
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 21.sp,
    ),
    bodyLarge = TextStyle(
        fontFamily = IbmPlexSans,
        fontSize = 16.sp,
        lineHeight = 23.sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = IbmPlexSans,
        fontSize = 14.sp,
        lineHeight = 20.sp,
    ),
    labelLarge = TextStyle(
        fontFamily = IbmPlexSans,
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp,
    ),
)

@Composable
fun MarginTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = MarginColors,
        typography = MarginTypography,
        content = content,
    )
}
