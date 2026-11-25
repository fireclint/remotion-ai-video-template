// Masks the person in each image of a folder with Apple's Vision framework.
//   swift scripts/segment.swift <in-folder> <out-folder>
// Writes one grayscale PNG per image (white = person) at the image's own size, same file name.
import CoreImage
import Foundation
import Vision

let inDir = URL(fileURLWithPath: CommandLine.arguments[1])
let outDir = URL(fileURLWithPath: CommandLine.arguments[2])
let files = try FileManager.default.contentsOfDirectory(at: inDir, includingPropertiesForKeys: nil)
  .filter { $0.pathExtension == "jpg" || $0.pathExtension == "png" }
  .sorted { $0.lastPathComponent < $1.lastPathComponent }

let context = CIContext()
let request = VNGeneratePersonSegmentationRequest()
request.qualityLevel = .accurate
request.outputPixelFormat = kCVPixelFormatType_OneComponent8
// A sequence handler keeps the mask steady from frame to frame.
let sequence = VNSequenceRequestHandler()

for file in files {
  guard let image = CIImage(contentsOf: file) else { continue }
  try sequence.perform([request], on: image)
  guard let buffer = request.results?.first?.pixelBuffer else { continue }
  let small = CIImage(cvPixelBuffer: buffer)
  let mask = small.transformed(by: CGAffineTransform(
    scaleX: image.extent.width / small.extent.width,
    y: image.extent.height / small.extent.height))
  let out = outDir.appendingPathComponent(file.deletingPathExtension().lastPathComponent + ".png")
  try context.writePNGRepresentation(of: mask, to: out, format: .L8, colorSpace: CGColorSpaceCreateDeviceGray())
}
