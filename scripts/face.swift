// Finds the largest face in each image of a folder with Apple's Vision framework.
//   swift scripts/face.swift <folder-of-jpgs>
// Prints JSON: [[cx, cy, w, h] | null, …] in file-name order, normalized 0–1, origin top-left.
import Foundation
import Vision

let dir = URL(fileURLWithPath: CommandLine.arguments[1])
let files = try FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil)
  .filter { $0.pathExtension == "jpg" }
  .sorted { $0.lastPathComponent < $1.lastPathComponent }

var out: [String] = []
for file in files {
  let request = VNDetectFaceRectanglesRequest()
  try VNImageRequestHandler(url: file).perform([request])
  let faces = request.results ?? []
  if let f = faces.max(by: { $0.boundingBox.width * $0.boundingBox.height < $1.boundingBox.width * $1.boundingBox.height }) {
    let b = f.boundingBox
    // Vision's origin is bottom-left; flip to top-left like the video.
    out.append(String(format: "[%.4f,%.4f,%.4f,%.4f]", b.midX, 1 - b.midY, b.width, b.height))
  } else {
    out.append("null")
  }
}
print("[" + out.joined(separator: ",") + "]")
