import SwiftUI
import WidgetKit

// MARK: - App Group data contract
// The app writes one JSON blob (see widgetSync.js) under this key; every
// widget decodes the slice it needs. Keep field names in sync with widgetSync.js.

let appGroupId = "group.com.collabnb.app"
let widgetDataKey = "widgetData"

struct WidgetPayload: Codable {
  var role: String?               // "creator" | "host"
  var nextCollab: NextCollab?
  var host: HostGlance?
  var tracker: Tracker?
  var updatedAt: Date?
}

struct NextCollab: Codable {
  var id: String
  var title: String
  var location: String
  var checkIn: Date
  var deadline: Date?
  var deliverablesDone: Int
  var deliverablesTotal: Int
}

struct HostGlance: Codable {
  var applicants: Int
  var activeCollabs: Int
  var unread: Int
  var nextCheckInName: String?
  var nextCheckInDate: Date?
}

struct Tracker: Codable {
  var id: String
  var title: String
  var partnerName: String
  var stage: Int                  // index into trackerStages
}

let trackerStages = ["Applied", "Approved", "Signed", "Stay", "Content", "Done"]

func loadPayload() -> WidgetPayload? {
  guard
    let raw = UserDefaults(suiteName: appGroupId)?.string(forKey: widgetDataKey),
    let data = raw.data(using: .utf8)
  else { return nil }
  let decoder = JSONDecoder()
  decoder.dateDecodingStrategy = .iso8601
  return try? decoder.decode(WidgetPayload.self, from: data)
}

// MARK: - Timeline

struct PayloadEntry: TimelineEntry {
  let date: Date
  let payload: WidgetPayload?
}

struct PayloadProvider: TimelineProvider {
  var preview: WidgetPayload

  func placeholder(in context: Context) -> PayloadEntry {
    PayloadEntry(date: .now, payload: preview)
  }

  func getSnapshot(in context: Context, completion: @escaping (PayloadEntry) -> Void) {
    completion(PayloadEntry(date: .now, payload: context.isPreview ? preview : (loadPayload() ?? preview)))
  }

  // The app pushes fresh data and calls reloadAllTimelines; the 30-minute
  // refresh only keeps countdowns ("in 2 days") from going stale.
  func getTimeline(in context: Context, completion: @escaping (Timeline<PayloadEntry>) -> Void) {
    let entry = PayloadEntry(date: .now, payload: loadPayload())
    completion(Timeline(entries: [entry], policy: .after(.now.addingTimeInterval(30 * 60))))
  }
}

// MARK: - Brand

enum Brand {
  static let ink = Color(red: 0.13, green: 0.16, blue: 0.15)
  static let sage = Color(red: 0.39, green: 0.42, blue: 0.38)
  static let green = Color(red: 0.176, green: 0.416, blue: 0.31)   // #2d6a4f
  static let bone = Color(red: 0.965, green: 0.953, blue: 0.933)   // #F6F3EE
  static let hairline = Color.black.opacity(0.08)
}

extension View {
  func collabnbBackground() -> some View {
    containerBackground(Brand.bone, for: .widget)
  }
}

struct ProgressBar: View {
  let value: Double
  var tint: Color = Brand.green
  var body: some View {
    GeometryReader { g in
      ZStack(alignment: .leading) {
        Capsule().fill(Brand.hairline)
        Capsule().fill(tint).frame(width: g.size.width * min(max(value, 0), 1))
      }
    }
    .frame(height: 5)
  }
}

let relativeDay = Date.RelativeFormatStyle(presentation: .named, unitsStyle: .wide)

struct EmptyWidgetView: View {
  let message: String
  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text("Collabnb").font(.caption.weight(.semibold)).foregroundStyle(Brand.green)
      Spacer()
      Text(message).font(.footnote).foregroundStyle(Brand.sage)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }
}

// MARK: - Bundle

@main
struct CollabnbWidgetBundle: WidgetBundle {
  var body: some Widget {
    NextCollabWidget()
    HostGlanceWidget()
    CollabTrackerWidget()
  }
}
