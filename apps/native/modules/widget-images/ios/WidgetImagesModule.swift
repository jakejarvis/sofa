import ExpoModulesCore
import UIKit

private let groupIdentifier = "group.com.jakejarvis.sofa"
private let imageDirectory = "widget_images"

public class WidgetImagesModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WidgetImages")

    AsyncFunction("downloadWidgetImage") { (url: String, key: String) -> String? in
      guard let imageUrl = URL(string: url) else {
        return nil
      }

      guard let directoryUrl = self.ensureImageDirectory() else {
        return nil
      }

      let destinationUrl = directoryUrl.appendingPathComponent(key)

      let (data, response) = try await URLSession.shared.data(from: imageUrl)

      guard let httpResponse = response as? HTTPURLResponse,
            httpResponse.statusCode == 200
      else {
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

    AsyncFunction("copyBundledAsset") { (assetName: String, key: String) -> String? in
      guard let directoryUrl = self.ensureImageDirectory() else {
        return nil
      }

      let destinationUrl = directoryUrl.appendingPathComponent(key)

      // Skip if already copied
      if FileManager.default.fileExists(atPath: destinationUrl.path) {
        return destinationUrl.absoluteString
      }

      guard let image = UIImage(named: assetName) else {
        return nil
      }

      guard let pngData = image.pngData() else {
        return nil
      }

      try pngData.write(to: destinationUrl, options: .atomic)
      return destinationUrl.absoluteString
    }

    AsyncFunction("clearWidgetImages") {
      guard let containerUrl = FileManager.default.containerURL(
        forSecurityApplicationGroupIdentifier: groupIdentifier
      ) else {
        return
      }

      let directoryUrl = containerUrl.appendingPathComponent(imageDirectory)
      try? FileManager.default.removeItem(at: directoryUrl)
    }
  }

  private func ensureImageDirectory() -> URL? {
    guard let containerUrl = FileManager.default.containerURL(
      forSecurityApplicationGroupIdentifier: groupIdentifier
    ) else {
      return nil
    }

    let directoryUrl = containerUrl.appendingPathComponent(imageDirectory)
    try? FileManager.default.createDirectory(
      at: directoryUrl,
      withIntermediateDirectories: true
    )
    return directoryUrl
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
