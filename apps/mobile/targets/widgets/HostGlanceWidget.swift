import SwiftUI
import WidgetKit

// Host: the dashboard's top strip (applicants, active collabs, inbox) plus
// the next creator arriving.

private let preview = WidgetPayload(
  role: "host",
  host: HostGlance(
    applicants: 4, activeCollabs: 2, unread: 3,
    nextCheckInName: "Maya R.", nextCheckInDate: .now.addingTimeInterval(2 * 86400)
  )
)

struct HostGlanceWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "HostGlance", provider: PayloadProvider(preview: preview)) { entry in
      HostGlanceView(host: entry.payload?.host)
        .collabnbBackground()
        .widgetURL(URL(string: "collabnb://host/dashboard"))
    }
    .configurationDisplayName("Today at a glance")
    .description("Applicants, active collabs and your inbox.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
  }
}

struct HostGlanceView: View {
  @Environment(\.widgetFamily) var family
  let host: HostGlance?

  var body: some View {
    if let h = host {
      switch family {
      case .accessoryRectangular:
        VStack(alignment: .leading, spacing: 2) {
          Text("Collabnb").font(.headline)
          Text("\(h.applicants) applicants · \(h.unread) unread").font(.caption)
          Text("\(h.activeCollabs) active collabs").font(.caption2)
        }
      case .systemMedium: medium(h)
      default: small(h)
      }
    } else {
      EmptyWidgetView(message: "Publish a listing to see activity")
    }
  }

  private func stat(_ num: Int, _ label: String) -> some View {
    VStack(spacing: 2) {
      Text("\(num)").font(.title2.weight(.bold).monospacedDigit()).foregroundStyle(Brand.ink)
      Text(label).font(.caption2).foregroundStyle(Brand.sage).lineLimit(1)
    }
    .frame(maxWidth: .infinity)
  }

  private func small(_ h: HostGlance) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("TODAY").font(.caption2.weight(.semibold)).foregroundStyle(Brand.green)
      row(h.applicants, "Applicants")
      row(h.activeCollabs, "Active collabs")
      row(h.unread, "Inbox")
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }

  private func row(_ num: Int, _ label: String) -> some View {
    HStack {
      Text(label).font(.caption).foregroundStyle(Brand.sage)
      Spacer()
      Text("\(num)").font(.subheadline.weight(.semibold).monospacedDigit()).foregroundStyle(Brand.ink)
    }
  }

  private func medium(_ h: HostGlance) -> some View {
    VStack(alignment: .leading, spacing: 10) {
      Text("TODAY AT A GLANCE").font(.caption2.weight(.semibold)).foregroundStyle(Brand.green)
      HStack(spacing: 0) {
        stat(h.applicants, "Applicants")
        Divider().frame(height: 28)
        stat(h.activeCollabs, "Active collabs")
        Divider().frame(height: 28)
        stat(h.unread, "Inbox")
      }
      Spacer(minLength: 0)
      if let name = h.nextCheckInName, let date = h.nextCheckInDate {
        Label {
          Text("\(name) arrives \(date.formatted(relativeDay))").lineLimit(1)
        } icon: { Image(systemName: "person.crop.circle") }
          .font(.caption).foregroundStyle(Brand.ink)
      } else {
        Text("No creators arriving soon").font(.caption).foregroundStyle(Brand.sage)
      }
    }
  }
}
