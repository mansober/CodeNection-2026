package com.codenection.breathe.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

val Ink = Color(0xFF1C2723)
val Forest = Color(0xFF315C50)
val Mint = Color(0xFFDCE8E1)
val SoftMint = Color(0xFFEDF2EE)
val Canvas = Color(0xFFF7F3EA)
val Paper = Color(0xFFFFFCF5)
val SurfaceMuted = Color(0xFFECE7DC)
val OutlineSoft = Color(0xFFD6D0C4)
val OutlineStrong = Color(0xFF747C77)
val Coral = Color(0xFFA63F21)
val CoralOnDark = Color(0xFFFFA182)
val SoftCoral = Color(0xFFF3DFD5)
val Amber = Color(0xFF8B6A2B)
val Blue = Color(0xFF4A666F)
val Violet = Color(0xFF655B6F)
val TextMuted = Color(0xFF5E6863)

private val BreatheColors = lightColorScheme(
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

private val BreatheTypography = Typography(
    headlineLarge = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 38.sp,
        lineHeight = 41.sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 28.sp,
        lineHeight = 32.sp,
    ),
    titleLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 21.sp,
        lineHeight = 27.sp,
    ),
    titleMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 21.sp,
    ),
    bodyLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontSize = 16.sp,
        lineHeight = 23.sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontSize = 14.sp,
        lineHeight = 20.sp,
    ),
    labelLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp,
    ),
)

@Composable
fun BreatheTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = BreatheColors,
        typography = BreatheTypography,
        content = content,
    )
}
