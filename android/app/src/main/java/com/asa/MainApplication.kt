package com.asa

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import com.microsoft.codepush.react.CodePush

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
        
        // CodePush configuration
        override fun getJSBundleFile(): String? {
          return CodePush.getJSBundleFile()
        }
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    try {
      // Khởi tạo Firebase
      FirebaseApp.initializeApp(this)
      
      // Khởi tạo FCM
      FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
        if (!task.isSuccessful) {
          println("Fetching FCM registration token failed: ${task.exception}")
          return@addOnCompleteListener
        }

        // Get new FCM registration token
        val token = task.result
        println("FCM Token: $token")
      }
    } catch (e: Exception) {
      e.printStackTrace()
    }
    loadReactNative(this)
  }
}
