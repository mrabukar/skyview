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
  CUSTOMER_MENU_PAGE_SIZE,
  chunkPages,
  formatMenuPrice,
  groupCustomerMenuByCategory,
  type CustomerMenuPdfItem,
} from "@/lib/pos/customer-menu";

registerReportFonts();

const s = StyleSheet.create({
  page: {
    fontFamily: "Plus Jakarta Sans",
    backgroundColor: "#1a0f0c",
    color: "#fdf6ec",
    paddingTop: 36,
    paddingBottom: 110,
    paddingHorizontal: 48,
    position: "relative",
  },
  decoLeft: {
    position: "absolute",
    left: -20,
    bottom: 40,
    width: 170,
    height: 230,
    opacity: 0.55,
  },
  decoRight: {
    position: "absolute",
    right: -24,
    top: 80,
    width: 160,
    height: 220,
    opacity: 0.55,
  },
  decoBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    width: 595,
    height: 90,
    opacity: 0.5,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  menuLabel: {
    marginTop: 8,
    fontSize: 9,
    letterSpacing: 4,
    color: "#f9a72a",
    fontWeight: 600,
  },
  title: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: 3,
    color: "#fdf6ec",
  },
  branch: {
    marginTop: 4,
    fontSize: 10,
    color: "#d4c4b0",
  },
  ksh: {
    marginTop: 3,
    fontSize: 8,
    color: "#a89078",
  },
  list: {
    width: 400,
    alignSelf: "center",
  },
  categoryBlock: {
    marginTop: 16,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  categoryRule: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(249, 167, 42, 0.4)",
  },
  categoryCenter: {
    alignItems: "center",
    paddingHorizontal: 10,
  },
  categoryEyebrow: {
    fontSize: 7,
    letterSpacing: 2.5,
    color: "#a89078",
    fontWeight: 600,
    textAlign: "center",
    marginBottom: 2,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: "#f9a72a",
    textAlign: "center",
  },
  sizeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sizeRowSpacer: {
    flex: 1,
  },
  sizeHead: {
    width: 36,
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: 1,
    color: "#f9a72a",
    textAlign: "center",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
  },
  thumb: {
    width: 36,
    height: 48,
    borderRadius: 6,
    objectFit: "contain",
    marginRight: 8,
  },
  thumbFallback: {
    width: 36,
    height: 48,
    borderRadius: 6,
    backgroundColor: "#3F201B",
    marginRight: 8,
  },
  name: {
    flex: 1,
    fontSize: 10,
    fontWeight: 500,
    color: "#fdf6ec",
  },
  price: {
    width: 36,
    fontSize: 10,
    textAlign: "center",
    color: "#fdf6ec",
  },
});

interface Props {
  items: CustomerMenuPdfItem[];
  branchName: string;
  organizationName?: string | null;
  deco?: {
    left: string | null;
    right: string | null;
    bottom: string | null;
  };
}

export function CustomerMenuPdfDocument({
  items,
  branchName,
  organizationName,
  deco,
}: Props) {
  const pages = chunkPages(items, CUSTOMER_MENU_PAGE_SIZE);
  const org = (organizationName || APP_NAME).toUpperCase();

  return (
    <Document title={`${org} Menu`} author={APP_NAME} subject="Customer menu">
      {pages.map((pageItems, pageIdx) => {
        const groups = groupCustomerMenuByCategory(pageItems);
        return (
          <Page key={pageIdx} size="A4" style={s.page}>
            {deco?.left ? (
              <Image src={deco.left} style={s.decoLeft} />
            ) : null}
            {deco?.right ? (
              <Image src={deco.right} style={s.decoRight} />
            ) : null}
            {deco?.bottom ? (
              <Image src={deco.bottom} style={s.decoBottom} />
            ) : null}

            <View style={s.header}>
              <ReportLogoMark size={36} />
              <Text style={s.menuLabel}>MENU</Text>
              <Text style={s.title}>{org}</Text>
              <Text style={s.branch}>{branchName}</Text>
              <Text style={s.ksh}>Prices in KSh</Text>
            </View>

            <View style={s.list}>
              {groups.map((group) => (
                <View key={group.categoryName}>
                  <View style={s.categoryBlock} wrap={false}>
                    <View style={s.categoryRule} />
                    <View style={s.categoryCenter}>
                      <Text style={s.categoryEyebrow}>CATEGORY</Text>
                      <Text style={s.categoryName}>{group.categoryName}</Text>
                    </View>
                    <View style={s.categoryRule} />
                  </View>
                  <View style={s.sizeRow} wrap={false}>
                    <View style={s.sizeRowSpacer} />
                    <Text style={s.sizeHead}>S</Text>
                    <Text style={s.sizeHead}>M</Text>
                    <Text style={s.sizeHead}>L</Text>
                  </View>
                  {group.items.map((item) => (
                    <View key={item.id} style={s.itemRow} wrap={false}>
                      {item.imageSrc ? (
                        <Image src={item.imageSrc} style={s.thumb} />
                      ) : (
                        <View style={s.thumbFallback} />
                      )}
                      <Text style={s.name}>{item.name}</Text>
                      {item.prices.map((price, i) => (
                        <Text key={i} style={s.price}>
                          {formatMenuPrice(price)}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </Page>
        );
      })}
    </Document>
  );
}
