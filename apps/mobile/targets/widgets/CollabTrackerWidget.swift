import SwiftUI
import WidgetKit

// Both roles: one collab's stage progress. The same stage model is meant to
// drive a Dynamic Island Live Activity later.

private let preview = WidgetPayload(
  role: "creator",
  tracker: Tracker(id: "preview", title: "Cliffside Villa", partnerName: "Uluwatu Stays", stage: 2)
)

struct CollabTrackerWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "CollabTracker", provider: PayloadProvider(preview: preview)) { entry in
      CollabTrackerView(tracker: entry.payload?.tracker)
        .collabnbBackground()
        .widgetURL(URL(string: "collabnb://collabs/\(entry.payload?.tracker?.id ?? "")"))
    }
    .configurationDisplayName("Collab tracker")
    .description("Where your current collab is at.")
    .supportedFamilies([.systemMedium, .accessoryRectangular])
  }
}

struct CollabTrackerView: View {
  @Environment(\.widgetFamily) var family
  let tracker: Tracker?

  var body: some View {
    if let t = tracker {
      let stage = min(max(t.stage, 0), trackerStages.count - 1)
      if family == .accessoryRectangular {
        VStack(alignment: .leading, spacing: 2) {
          Text(t.title).font(.headline).lineLimit(1)
          Text("\(trackerStages[stage]) · \(stage + 1) of \(trackerStages.count)").font(.caption)
          ProgressBar(value: Double(stage + 1) / Double(trackerStages.count), tint: .primary)
        }
      } else {
        VStack(alignment: .leading, spacing: 10) {
          HStack {
            VStack(alignment: .leading, spacing: 2) {
              Text(t.title).font(.headline).foregroundStyle(Brand.ink).lineLimit(1)
              Text("with \(t.partnerName)").font(.caption).foregroundStyle(Brand.sage).lineLimit(1)
            }
            Spacer()
            Text(trackerStages[stage]).font(.caption.weight(.semibold))
              .padding(.horizontal, 10).padding(.vertical, 4)
              .background(Brand.green.opacity(0.12), in: Capsule())
              .foregroundStyle(Brand.green)
          }
          Spacer(minLength: 0)
          StageBar(current: stage)
        }
      }
    } else {
      EmptyWidgetView(message: "No collab in progress")
    }
  }
}

private struct StageBar: View {
  let current: Int
  var body: some View {
    let n = trackerStages.count
    HStack(spacing: 0) {
      ForEach(trackerStages.indices, id: \.self) { i in
        VStack(spacing: 6) {
          Circle()
            .fill(i <= current ? Brand.green : Brand.hairline)
            .frame(width: 10, height: 10)
          Text(trackerStages[i])
            .font(.system(size: 8, weight: i == current ? .semibold : .regular))
            .foregroundStyle(i == current ? Brand.ink : Brand.sage)
            .lineLimit(1)
        }
        .frame(maxWidth: .infinity)
      }
    }
    // Connector runs dot-center to dot-center behind the stage columns.
    .background(alignment: .topLeading) {
      GeometryReader { g in
        let step = g.size.width / CGFloat(n)
        ZStack(alignment: .leading) {
          Rectangle().fill(Brand.hairline).frame(width: step * CGFloat(n - 1), height: 2)
          Rectangle().fill(Brand.green).frame(width: step * CGFloat(current), height: 2)
        }
        .offset(x: step / 2, y: 4)
      }
    }
  }
}
