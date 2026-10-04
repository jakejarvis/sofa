import ExpoModulesCore
import Foundation
import UIKit

private let imageDirectory = "widget_images"
private let widgetIconKey = "sofa_icon.png"
private let infoPlistAppGroupKey = "ExpoWidgetsAppGroupIdentifier"
private let logPrefix = "[SofaWidgetsSupport]"
// systemSmall widgets are at most 170pt square (510px at 3x). WidgetKit refuses to
// render images whose pixel area is far beyond the widget's, so artwork is cropped
// to that square.
private let widgetImagePixelSize: CGFloat = 510

public class SofaWidgetsSupportModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SofaWidgetsSupport")

    AsyncFunction("downloadWidgetImage") { (url: String, key: String) -> String? in
      guard let imageUrl = URL(string: url) else {
        self.log("Invalid widget image URL: \(url)")
        return nil
      }

      guard let destinationUrl = self.destinationURL(for: key) else {
        return nil
      }

      let (data, response) = try await URLSession.shared.data(from: imageUrl)

      guard let httpResponse = response as? HTTPURLResponse,
            httpResponse.statusCode == 200
      else {
        self.log("Failed to download widget image: \(url)")
        return nil
      }

      guard let image = UIImage(data: data) else {
        return nil
      }

      let resized = squareThumbnail(image, side: widgetImagePixelSize)

      guard let jpegData = resized.jpegData(compressionQuality: 0.8) else {
        return nil
      }

      try jpegData.write(to: destinationUrl, options: .atomic)
      return destinationUrl.absoluteString
    }

    AsyncFunction("copyBundledAsset") { (assetUri: String, key: String) -> String? in
      guard let destinationUrl = self.destinationURL(for: key) else {
        return nil
      }

      // Skip if already copied
      if FileManager.default.fileExists(atPath: destinationUrl.path) {
        return destinationUrl.absoluteString
      }

      guard let sourceUrl = self.resolveAssetURL(assetUri) else {
        self.log("Unable to resolve widget asset URI: \(assetUri)")
        return nil
      }

      let data: Data
      if sourceUrl.isFileURL {
        data = try Data(contentsOf: sourceUrl)
      } else {
        let (downloadedData, response) = try await URLSession.shared.data(from: sourceUrl)
        if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode != 200 {
          self.log("Failed to download widget asset: \(assetUri)")
          return nil
        }
        data = downloadedData
      }

      try data.write(to: destinationUrl, options: .atomic)
      return destinationUrl.absoluteString
    }

    AsyncFunction("clearWidgetImages") {
      guard let directoryUrl = self.imageDirectoryURL() else {
        return
      }

      try? FileManager.default.removeItem(at: directoryUrl)
    }

    AsyncFunction("pruneWidgetImages") { (maxAgeSeconds: Double) in
      guard maxAgeSeconds > 0 else {
        return
      }

      guard let directoryUrl = self.imageDirectoryURL() else {
        return
      }

      let fileManager = FileManager.default
      let cutoffDate = Date().addingTimeInterval(-maxAgeSeconds)
      let resourceKeys: Set<URLResourceKey> = [.contentModificationDateKey]

      let fileUrls = try fileManager.contentsOfDirectory(
        at: directoryUrl,
        includingPropertiesForKeys: Array(resourceKeys),
        options: [.skipsHiddenFiles]
      )

      for fileUrl in fileUrls {
        if fileUrl.lastPathComponent == widgetIconKey {
          continue
        }

        let modifiedAt = try fileUrl.resourceValues(forKeys: resourceKeys).contentModificationDate
          ?? .distantPast
        if modifiedAt < cutoffDate {
          try? fileManager.removeItem(at: fileUrl)
        }
      }
    }
  }

  private func appGroupIdentifier() -> String? {
    guard let identifier = Bundle.main.object(
      forInfoDictionaryKey: infoPlistAppGroupKey
    ) as? String, !identifier.isEmpty else {
      log("Missing \(infoPlistAppGroupKey) in Info.plist")
      return nil
    }
    return identifier
  }

  private func imageDirectoryURL() -> URL? {
    guard let groupIdentifier = appGroupIdentifier() else {
      return nil
    }

    guard let containerUrl = FileManager.default.containerURL(
      forSecurityApplicationGroupIdentifier: groupIdentifier
    ) else {
      log("Unable to access app group container: \(groupIdentifier)")
      return nil
    }

    let directoryUrl = containerUrl.appendingPathComponent(imageDirectory)
    try? FileManager.default.createDirectory(
      at: directoryUrl,
      withIntermediateDirectories: true
    )
    return directoryUrl
  }

  private func destinationURL(for key: String) -> URL? {
    guard let directoryUrl = imageDirectoryURL() else {
      return nil
    }

    return directoryUrl.appendingPathComponent(normalizedFileName(key))
  }

  private func resolveAssetURL(_ assetUri: String) -> URL? {
    if assetUri.isEmpty {
      return nil
    }

    if let url = URL(string: assetUri), url.scheme != nil {
      return url
    }

    return URL(fileURLWithPath: assetUri)
  }

  private func normalizedFileName(_ key: String) -> String {
    let fallback = UUID().uuidString
    let source = key.isEmpty ? fallback : key
    let allowedCharacters = CharacterSet.alphanumerics.union(
      CharacterSet(charactersIn: "._-")
    )
    let normalized = source.components(separatedBy: allowedCharacters.inverted).joined(separator: "_")
    return normalized.isEmpty ? fallback : normalized
  }

  private func log(_ message: String) {
    print("\(logPrefix) \(message)")
  }

  /// Scales `image` to cover a `side`×`side` square (never upscaling) and center-crops it.
  /// Renders at scale 1 so the output's pixel size equals its point size; the default
  /// renderer format uses the screen scale and would triple the pixel dimensions.
  private func squareThumbnail(_ image: UIImage, side maxSide: CGFloat) -> UIImage {
    let size = image.size
    guard size.width > 0, size.height > 0 else { return image }
    let side = min(maxSide, size.width, size.height).rounded(.down)
    let scale = side / min(size.width, size.height)
    let drawSize = CGSize(width: size.width * scale, height: size.height * scale)
    let origin = CGPoint(x: (side - drawSize.width) / 2, y: (side - drawSize.height) / 2)

    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    format.opaque = true
    let renderer = UIGraphicsImageRenderer(size: CGSize(width: side, height: side), format: format)
    return renderer.image { _ in
      image.draw(in: CGRect(origin: origin, size: drawSize))
    }
  }
}
