import SwiftUI
import WidgetKit

// Creator: the upcoming stay, deliverables progress and the content deadline.

private let preview = WidgetPayload(
  role: "creator",
  nextCollab: NextCollab(
    id: "preview", title: "Cliffside Villa", location: "Uluwatu, Bali",
    checkIn: .now.addingTimeInterval(3 * 86400), deadline: .now.addingTimeInterval(10 * 86400),
    deliverablesDone: 1, deliverablesTotal: 3
  )
)

struct NextCollabWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "NextCollab", provider: PayloadProvider(preview: preview)) { entry in
      NextCollabView(collab: entry.payload?.nextCollab)
        .collabnbBackground()
        .widgetURL(URL(string: "collabnb://collabs/\(entry.payload?.nextCollab?.id ?? "")"))
    }
    .configurationDisplayName("Next collab")
    .description("Your upcoming stay and what's due.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
  }
}

struct NextCollabView: View {
  @Environment(\.widgetFamily) var family
  let collab: NextCollab?

  var body: some View {
    if let c = collab {
      switch family {
      case .accessoryRectangular: lockScreen(c)
      case .systemMedium: medium(c)
      default: small(c)
      }
    } else {
      EmptyWidgetView(message: "No upcoming collabs yet")
    }
  }

  private func progress(_ c: NextCollab) -> Double {
    c.deliverablesTotal == 0 ? 0 : Double(c.deliverablesDone) / Double(c.deliverablesTotal)
  }

  private func small(_ c: NextCollab) -> some View {
    VStack(alignment: .leading, spacing: 4) {
      Text("NEXT COLLAB").font(.caption2.weight(.semibold)).foregroundStyle(Brand.green)
      Text(c.title).font(.headline).foregroundStyle(Brand.ink).lineLimit(2)
      Text("Check-in \(c.checkIn.formatted(relativeDay))").font(.caption).foregroundStyle(Brand.sage).lineLimit(1)
      Spacer(minLength: 0)
      ProgressBar(value: progress(c))
      Text("\(c.deliverablesDone)/\(c.deliverablesTotal) delivered")
        .font(.caption2.monospacedDigit()).foregroundStyle(Brand.sage)
    }
  }

  private func medium(_ c: NextCollab) -> some View {
    HStack(spacing: 14) {
      VStack(alignment: .leading, spacing: 4) {
        Text("NEXT COLLAB").font(.caption2.weight(.semibold)).foregroundStyle(Brand.green)
        Text(c.title).font(.headline).foregroundStyle(Brand.ink).lineLimit(1)
        Text(c.location).font(.caption).foregroundStyle(Brand.sage).lineLimit(1)
        Spacer(minLength: 0)
        Label { Text(c.checkIn, format: .dateTime.month().day()) } icon: { Image(systemName: "calendar") }
          .font(.caption).foregroundStyle(Brand.ink)
      }
      Spacer(minLength: 0)
      VStack(alignment: .trailing, spacing: 6) {
        ZStack {
          Circle().stroke(Brand.hairline, lineWidth: 6)
          Circle().trim(from: 0, to: progress(c))
            .stroke(Brand.green, style: StrokeStyle(lineWidth: 6, lineCap: .round))
            .rotationEffect(.degrees(-90))
          Text("\(c.deliverablesDone)/\(c.deliverablesTotal)")
            .font(.subheadline.weight(.semibold).monospacedDigit()).foregroundStyle(Brand.ink)
        }
        .frame(width: 58, height: 58)
        if let d = c.deadline {
          Text("Due \(d.formatted(relativeDay))").font(.caption2).foregroundStyle(Brand.sage)
        }
      }
    }
  }

  private func lockScreen(_ c: NextCollab) -> some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(c.title).font(.headline).lineLimit(1)
      Text("Check-in \(c.checkIn.formatted(relativeDay))").font(.caption)
      Text("\(c.deliverablesDone)/\(c.deliverablesTotal) delivered").font(.caption2)
    }
  }
}
