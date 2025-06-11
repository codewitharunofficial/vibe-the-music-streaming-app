package com.codewitharun.vibe
import android.media.MediaMetadataRetriever
import android.net.Uri
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = AudioMetadataModule.NAME)
class AudioMetadataModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {
  companion object {
    const val NAME = "AudioMetadata"
  }

  override fun getName() = NAME

  @ReactMethod
  fun getAudioMetadata(uriString: String, promise: Promise) {
    try {
      val retriever = MediaMetadataRetriever()
      val uri = Uri.parse(uriString)
      retriever.setDataSource(reactApplicationContext, uri)

      val metadata = Arguments.createMap()
      metadata.putString("title", retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE))
      metadata.putString("artist", retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST))
      metadata.putString("duration", retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION))

      retriever.release()
      promise.resolve(metadata)
    } catch (e: Exception) {
      promise.reject("META_ERROR", "Failed to get metadata", e)
    }
  }
}
