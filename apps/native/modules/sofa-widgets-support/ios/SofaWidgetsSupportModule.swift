import ExpoModulesCore
import Foundation
import UIKit

private let imageDirectory = "widget_images"
private let widgetIconKey = "sofa_icon.png"
private let infoPlistAppGroupKey = "ExpoWidgetsAppGroupIdentifier"
private let logPrefix = "[SofaWidgetsSupport]"

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

      // Resize to fit widget dimensions (systemSmall ~155pt = ~465px at 3x)
      let maxDimension: CGFloat = 465
      let resized = resizeImage(image, maxDimension: maxDimension)

      guard let jpegData = resized.jpegData(compressionQuality: 0.7) else {
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

  private func resizeImage(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
    let size = image.size
    let scale = min(maxDimension / size.width, maxDimension / size.height, 1.0)

    if scale >= 1.0 { return image }

    let newSize = CGSize(
      width: round(size.width * scale),
      height: round(size.height * scale)
    )

    let renderer = UIGraphicsImageRenderer(size: newSize)
    return renderer.image { _ in
      image.draw(in: CGRect(origin: .zero, size: newSize))
    }
  }
}
