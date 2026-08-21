"use client";

import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { ReportLogoMark, registerReportFonts } from "@/lib/reports/pdf/theme";
import { APP_NAME } from "@/lib/page-title";
import {
  POSTER_DEFAULT_TOPPING_PRICE,
  POSTER_DEFAULT_TOPPINGS,
  POSTER_ICE_LEVELS,
  POSTER_SUGAR_LEVELS,
  categoryMenuBlurb,
  chunkPosterPages,
  customerMenuBlurb,
  filledSizePrices,
  formatMenuPrice,
  uniqueMenuCategories,
  type CustomerMenuPdfItem,
  type PosterTopping,
} from "@/lib/pos/customer-menu";

registerReportFonts();

const s = StyleSheet.create({
  page: {
    fontFamily: "Plus Jakarta Sans",
    backgroundColor: "#12081a",
    color: "#ffffff",
    position: "relative",
    padding: 16,
  },
  bg: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 842,
    height: 595,
    objectFit: "cover",
  },
  veil: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 842,
    height: 595,
    backgroundColor: "rgba(18, 8, 26, 0.22)",
  },
  header: {
    alignItems: "center",
    marginBottom: 6,
  },
  org: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: 2.4,
    color: "#ffffff",
  },
  script: {
    marginTop: 2,
    fontSize: 14,
    fontStyle: "italic",
    color: "#ffffff",
  },
  tagline: {
    marginTop: 2,
    fontSize: 8,
    color: "rgba(255,255,255,0.8)",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 5,
    marginBottom: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipActive: {
    borderColor: "#f9a72a",
    backgroundColor: "rgba(249,167,42,0.16)",
  },
  chipText: {
    fontSize: 7,
    fontWeight: 600,
    color: "#ffffff",
  },
  rows: {
    flexGrow: 1,
    gap: 6,
  },
  categoryRow: {
    flex: 1,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(0,0,0,0.42)",
    borderRadius: 12,
    padding: 6,
    gap: 6,
  },
  rail: {
    width: 118,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  railName: {
    marginTop: 4,
    fontSize: 8,
    fontWeight: 800,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#ffffff",
    textAlign: "center",
  },
  railBlurb: {
    marginTop: 2,
    fontSize: 6.5,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },
  cards: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
  },
  itemCard: {
    flex: 1,
    maxWidth: 168,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 10,
    padding: 6,
  },
  thumb: {
    width: 42,
    height: 56,
    borderRadius: 8,
    objectFit: "contain",
  },
  thumbFallback: {
    width: 42,
    height: 56,
    borderRadius: 8,
    backgroundColor: "#3F201B",
  },
  itemBody: {
    flex: 1,
  },
  itemName: {
    fontSize: 8,
    fontWeight: 700,
    color: "#ffffff",
  },
  itemBlurb: {
    fontSize: 6.5,
    color: "rgba(255,255,255,0.62)",
    marginTop: 1,
  },
  priceRow: {
    flexDirection: "row",
    gap: 3,
    marginTop: 4,
  },
  priceCol: {
    flex: 1,
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 6,
    fontWeight: 600,
    color: "rgba(255,255,255,0.55)",
    marginBottom: 1,
  },
  priceBox: {
    width: "100%",
    textAlign: "center",
    borderWidth: 1,
    borderColor: "rgba(232, 121, 249, 0.35)",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 3,
    paddingVertical: 2,
    fontSize: 7,
    fontWeight: 600,
    color: "#ffffff",
  },
  bottom: {
    flexDirection: "row",
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(0,0,0,0.42)",
    borderRadius: 12,
  },
  bottomCell: {
    flex: 1,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.18)",
    borderRightStyle: "dotted",
  },
  bottomCellLast: {
    flex: 1,
    padding: 8,
  },
  bottomHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  bottomTitle: {
    fontSize: 8,
    fontWeight: 600,
    color: "#ffffff",
  },
  badge: {
    backgroundColor: "#c084fc",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeOn: {
    color: "#1a0f0c",
    fontSize: 6.5,
    fontWeight: 700,
  },
  badgeGhost: {
    borderWidth: 1,
    borderColor: "rgba(249,167,42,0.6)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeGhostText: {
    color: "#f9a72a",
    fontSize: 6.5,
    fontWeight: 700,
  },
  bottomBody: {
    fontSize: 7,
    color: "rgba(255,255,255,0.72)",
  },
  footer: {
    marginTop: 8,
    fontSize: 8,
    textAlign: "center",
    color: "rgba(255,255,255,0.7)",
  },
});

interface Props {
  items: CustomerMenuPdfItem[];
  branchName: string;
  organizationName?: string | null;
  backgroundSrc?: string | null;
  toppings?: PosterTopping[];
  categoryDescriptions?: Record<string, string | null>;
}

export function CustomerMenuPosterPdfDocument({
  items,
  branchName,
  organizationName,
  backgroundSrc,
  toppings = [],
  categoryDescriptions = {},
}: Props) {
  const pages = chunkPosterPages(items);
  const org = (organizationName || APP_NAME).toUpperCase();
  const categories = uniqueMenuCategories(items);
  const toppingNames =
    toppings.length > 0
      ? toppings.slice(0, 5).map((t) => t.name)
      : [...POSTER_DEFAULT_TOPPINGS];
  const toppingPrice = toppings[0]?.price ?? POSTER_DEFAULT_TOPPING_PRICE;

  return (
    <Document title={`${org} Menu`} author={APP_NAME} subject="Customer menu">
      {pages.map((pageRows, pageIdx) => (
        <Page
          key={pageIdx}
          size="A4"
          orientation="landscape"
          style={s.page}
        >
          {backgroundSrc ? (
            <Image src={backgroundSrc} style={s.bg} />
          ) : null}
          <View style={s.veil} />

          <View style={s.header}>
            <ReportLogoMark size={28} />
            <Text style={s.org}>{org}</Text>
            <Text style={s.script}>— Bubble Tea Menu —</Text>
            <Text style={s.tagline}>
              Fresh. Chewy. Delicious. · {branchName}
            </Text>
          </View>

          <View style={s.chips}>
            <View style={[s.chip, s.chipActive]}>
              <Text style={s.chipText}>All Drinks</Text>
            </View>
            {categories.map((name) => (
              <View key={name} style={s.chip}>
                <Text style={s.chipText}>{name}</Text>
              </View>
            ))}
          </View>

          <View style={s.rows}>
            {pageRows.map((row, i) => (
              <View
                key={`${row.categoryName}-${i}`}
                style={s.categoryRow}
                wrap={false}
              >
                <View style={s.rail}>
                  <Text style={s.railName}>{row.categoryName}</Text>
                  <Text style={s.railBlurb}>
                    {categoryMenuBlurb(
                      row.categoryName,
                      categoryDescriptions,
                    )}
                  </Text>
                </View>
                <View style={s.cards}>
                  {row.items.map((item) => {
                    const prices = filledSizePrices(item.prices);
                    return (
                      <View key={item.id} style={s.itemCard}>
                        {item.imageSrc ? (
                          <Image src={item.imageSrc} style={s.thumb} />
                        ) : (
                          <View style={s.thumbFallback} />
                        )}
                        <View style={s.itemBody}>
                          <Text style={s.itemName}>{item.name}</Text>
                          <Text style={s.itemBlurb}>
                            {customerMenuBlurb(item)}
                          </Text>
                          <View style={s.priceRow}>
                            {(["S", "M", "L"] as const).map((label, pi) => (
                              <View key={label} style={s.priceCol}>
                                <Text style={s.priceLabel}>{label}</Text>
                                <Text style={s.priceBox}>
                                  {formatMenuPrice(prices[pi])}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>

          <View style={s.bottom}>
            <View style={s.bottomCell}>
              <View style={s.bottomHead}>
                <Text style={s.bottomTitle}>Extra Toppings</Text>
                <View style={s.badge}>
                  <Text style={s.badgeOn}>
                    + KSh {formatMenuPrice(toppingPrice)}
                  </Text>
                </View>
              </View>
              <Text style={s.bottomBody}>{toppingNames.join(" · ")}</Text>
            </View>
            <View style={s.bottomCell}>
              <View style={s.bottomHead}>
                <Text style={s.bottomTitle}>Less Sugar</Text>
                <View style={s.badgeGhost}>
                  <Text style={s.badgeGhostText}>FREE</Text>
                </View>
              </View>
              <Text style={s.bottomBody}>
                {POSTER_SUGAR_LEVELS.join(" · ")}
              </Text>
            </View>
            <View style={s.bottomCellLast}>
              <View style={s.bottomHead}>
                <Text style={s.bottomTitle}>Ice Level</Text>
                <View style={s.badgeGhost}>
                  <Text style={s.badgeGhostText}>FREE</Text>
                </View>
              </View>
              <Text style={s.bottomBody}>{POSTER_ICE_LEVELS.join(" · ")}</Text>
            </View>
          </View>

          <Text style={s.footer}>
            Thank you for choosing {organizationName || APP_NAME}. Enjoy your
            drink!
          </Text>
        </Page>
      ))}
    </Document>
  );
}
