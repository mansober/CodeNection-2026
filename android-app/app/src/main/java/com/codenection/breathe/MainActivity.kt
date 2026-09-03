package com.codenection.breathe

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.codenection.breathe.ui.BreatheApp
import com.codenection.breathe.ui.theme.BreatheTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            BreatheTheme {
                BreatheApp()
            }
        }
    }
}
