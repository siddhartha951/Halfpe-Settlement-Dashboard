---
version: alpha
name: Notion
description: "Notion's marketing system is calm, editorial and near-monochrome: pure white canvases with black ink, warm-grey secondary text (#615D59, #A39E98) and a soft warm off-white surface (#F6F5F4) for alternating bands. A single confident blue (#0075DE) carries primary CTAs and focus rings, with a lighter link blue, a deep pressed blue and a pale blue tint for selected chips. Small bursts of illustration accent color (amber, coral red, green, indigo, lavender) appear in feature cards and badges. Typography is Notion's Inter cut with very tight negative tracking on giant display headlines (96px/72px/54px), medium-weight 14–16px UI text, and Lyon Text serif reserved for testimonial blockquotes. Geometry is soft: 8px is the workhorse radius, 12px for cards, 4px for small controls and pills for buttons and tags, with whisper-light layered shadows."
colors:
  primary: "#0075DE"
  primary-focus: "#0075DE"
  primary-link: "#097FE8"
  primary-pressed: "#005BAB"
  primary-tint: "#E6F3FE"
  on-primary: "#FFFFFF"
  ink: "#000000"
  body-secondary: "#615D59"
  muted: "#A39E98"
  surface: "#FFFFFF"
  surface-warm: "#F6F5F4"
  hairline: "#DFDCD9"
  accent-amber: "#FFB110"
  accent-amber-deep: "#E89D01"
  accent-coral: "#F64932"
  accent-red: "#E32D14"
  success: "#1AAE39"
  success-tint: "#D0F4D8"
  accent-indigo: "#1313BA"
  chip-lavender: "#EADBFA"
typography:
  hero-display:
    fontFamily: Notion Inter
    fontSize: 96px
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: -4.6px
  display-lg:
    fontFamily: Notion Inter
    fontSize: 72px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: -2px
  display-md:
    fontFamily: Notion Inter
    fontSize: 54px
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: -1.87501px
  display-sm:
    fontFamily: Notion Inter
    fontSize: 40px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: normal
  title-lg:
    fontFamily: Notion Inter
    fontSize: 24px
    fontWeight: 500
    lineHeight: 0.85
    letterSpacing: normal
  title-md:
    fontFamily: Notion Inter
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: -0.25px
  title-sm:
    fontFamily: Notion Inter
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: -0.125px
  quote:
    fontFamily: Lyon Text
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: normal
  body:
    fontFamily: Notion Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: normal
  body-medium:
    fontFamily: Notion Inter
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: normal
  body-strong:
    fontFamily: Notion Inter
    fontSize: 16px
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: normal
  nav-link:
    fontFamily: Notion Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: normal
  button:
    fontFamily: Notion Inter
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: normal
  body-sm:
    fontFamily: Notion Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: normal
  caption:
    fontFamily: Notion Inter
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: 0.125px
rounded:
  xs: 4px
  sm: 8px
  md: 12px
  full: 9999px
spacing:
  section-padding-y: 96px
  card-2-grid-gap: 8px
  button-primary-padding-y: 4px
  button-primary-padding-x: 14px
  button-primary-2-padding-y: 6px
  button-primary-2-padding-x: 15px
  button-secondary-padding-y: 6px
  button-secondary-padding-x: 15px
  button-secondary-2-padding-y: 6px
  button-secondary-2-padding-x: 15px
  button-ghost-padding-y: 5px
  button-ghost-padding-x: 10px
  button-ghost-2-padding-y: 5px
  button-ghost-2-padding-x: 10px
components:
  button-primary:
    backgroundColor: "#0075DE"
    textColor: "#FFFFFF"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 16px
      fontWeight: 500
      lineHeight: 24px
    rounded: 8px
    height: 36px
  button-primary-label:
    textColor: "#FFFFFF"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 14px
      fontWeight: 500
      lineHeight: 20px
  button-primary-hover:
    backgroundColor: "#005BAB"
  button-primary-focus:
    backgroundColor: "#005BAB"
  button-primary-2:
    backgroundColor: "#0075DE"
    textColor: "#FFFFFF"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 16px
      fontWeight: 500
      lineHeight: 24px
    rounded: 8px
    height: 38px
  button-primary-2-hover:
    backgroundColor: "#005BAB"
  button-primary-2-focus:
    backgroundColor: "#005BAB"
  button-secondary:
    backgroundColor: "#E6F3FE"
    textColor: "#005BAB"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 16px
      fontWeight: 500
      lineHeight: 24px
    rounded: 8px
    height: 38px
  button-secondary-hover:
    backgroundColor: "#F2F9FF"
  button-secondary-focus:
    backgroundColor: "#F2F9FF"
  button-secondary-2:
    backgroundColor: "#FFFFFF"
    textColor: "#097FE8"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 16px
      fontWeight: 500
      lineHeight: 24px
    rounded: 8px
    height: 38px
  button-secondary-2-hover:
    backgroundColor: "#DFDCD9"
    textColor: "#000000"
  button-secondary-2-focus:
    backgroundColor: "#DFDCD9"
    textColor: "#000000"
  button-ghost:
    backgroundColor: transparent
    textColor: "#000000E5"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 16px
      fontWeight: 400
      lineHeight: 24px
    rounded: 4px
    height: 30px
  button-ghost-label:
    textColor: "#000000E5"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 14px
      fontWeight: 500
      lineHeight: 20px
  button-ghost-icon:
    size: 10px
  button-ghost-hover:
    backgroundColor: "#0000000D"
  button-ghost-2:
    backgroundColor: transparent
    textColor: "#000000E5"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 16px
      fontWeight: 400
      lineHeight: 24px
    rounded: 4px
    height: 30px
  button-ghost-2-label:
    textColor: "#000000E5"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 14px
      fontWeight: 500
      lineHeight: 20px
  button-ghost-2-icon:
    size: 10px
  button-ghost-2-hover:
    backgroundColor: "#0000000D"
  card:
    backgroundColor: "#F9F9F8"
    textColor: "#000000E5"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 16px
      fontWeight: 400
      lineHeight: 24px
    padding: 24px
    height: 108px
  card-text:
    textColor: "#000000E5"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 14px
      fontWeight: 400
      lineHeight: 20px
  card-title:
    textColor: "#000000"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 22px
      fontWeight: 700
      lineHeight: 28px
      letterSpacing: -0.25px
  card-text-2:
    backgroundColor: "#000000"
    textColor: "#FFFFFF"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 20px
      fontWeight: 600
      lineHeight: 28px
      letterSpacing: -0.125px
  card-2:
    backgroundColor: "#FFFFFF"
    textColor: "#000000E5"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 16px
      fontWeight: 400
      lineHeight: 24px
    rounded: 12px
    padding: 24px
    height: 160px
  card-2-link:
    textColor: "#000000F2"
    height: 158px
    width: 237px
  card-2-group-2:
    textColor: "#097FE8"
    rounded: 9999.01px
  card-2-media:
    size: 40px
  card-2-title:
    textColor: "#000000"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 16px
      fontWeight: 700
      lineHeight: 24px
  card-2-text-2:
    textColor: "#000000"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 16px
      fontWeight: 700
      lineHeight: 24px
  card-3:
    textColor: "#FFFFFF"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 16px
      fontWeight: 400
      lineHeight: 24px
    rounded: 12px
    height: 492px
  card-3-media:
    height: 492px
    width: 394px
  card-3-group-4:
    padding: 24px
  card-3-media-2:
    height: 25px
    width: 87px
  card-3-text:
    textColor: "#FFFFFF"
    typography:
      fontFamily: "\"Lyon Text\", Georgia, YuMincho, \"Yu Mincho\", \"Hiragino Mincho ProN\", \"Hiragino Mincho Pro\", \"Songti TC\", \"Songti SC\", SimSun, \"Nanum Myeongjo\", NanumMyeongjo, Batang, serif"
      fontSize: 18px
      fontWeight: 400
      lineHeight: 28px
  hero:
    textColor: "#000000E5"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 16px
      fontWeight: 400
      lineHeight: 24px
    height: 308px
  hero-title:
    textColor: "#000000F2"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 96px
      fontWeight: 600
      lineHeight: 100px
      letterSpacing: -4.6px
  hero-group:
    backgroundColor: "#EADBFA"
    rounded: 9999.01px
  hero-text-2:
    textColor: "#000000F2"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 72px
      fontWeight: 500
      lineHeight: 87.12px
      letterSpacing: -2px
  hero-body:
    textColor: "#000000E5"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 20px
      fontWeight: 400
      lineHeight: 28px
      letterSpacing: -0.125px
  hero-cta:
    backgroundColor: "#0075DE"
    textColor: "#FFFFFF"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 16px
      fontWeight: 500
      lineHeight: 24px
    rounded: 8px
  hero-cta-2:
    backgroundColor: "#E6F3FE"
    textColor: "#005BAB"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 16px
      fontWeight: 500
      lineHeight: 24px
    rounded: 8px
  footer-navigation:
    textColor: "#000000E5"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 16px
      fontWeight: 400
      lineHeight: 24px
    height: 214px
  footer-navigation-item:
    textColor: "#0000008A"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 12px
      fontWeight: 500
      lineHeight: 16px
      letterSpacing: 0.125px
  footer-navigation-link:
    textColor: "#000000F2"
    rounded: 8px
  footer-navigation-text:
    textColor: "#000000E5"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 14px
      fontWeight: 500
      lineHeight: 20px
  footer-navigation-text-2:
    textColor: "#00000096"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 14px
      fontWeight: 500
      lineHeight: 20px
  media-control:
    backgroundColor: "#0000000D"
    textColor: "#FFFFFF"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 16px
      fontWeight: 400
      lineHeight: 24px
    height: 32px
  media-control-icon:
    size: 12px
  media-control-text:
    textColor: "#FFFFFF"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 16px
      fontWeight: 400
      lineHeight: 24px
  header:
    backgroundColor: "#FFFFFF"
    textColor: "#000000E5"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 16px
      fontWeight: 400
      lineHeight: 24px
    height: 64px
  header-logo:
    textColor: "#000000F2"
    height: 34px
    width: 33px
  header-logo-icon:
    height: 34px
    width: 33px
  header-cta:
    backgroundColor: transparent
    textColor: "#000000E5"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 16px
      fontWeight: 400
      lineHeight: 24px
    rounded: 4px
    height: 30px
  header-text:
    textColor: "#000000E5"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 14px
      fontWeight: 500
      lineHeight: 20px
  header-cta-icon:
    size: 10px
  header-link:
    textColor: "#000000E5"
    rounded: 4px
  header-cta-2:
    backgroundColor: "#0075DE"
    textColor: "#FFFFFF"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 16px
      fontWeight: 500
      lineHeight: 24px
    rounded: 8px
    height: 36px
  header-text-2:
    textColor: "#FFFFFF"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 14px
      fontWeight: 500
      lineHeight: 20px
  header-cta-hover:
    backgroundColor: "#0000000D"
  header-link-hover:
    backgroundColor: "#0000000D"
  header-cta-2-hover:
    backgroundColor: "#005BAB"
  header-cta-2-focus:
    backgroundColor: "#005BAB"
  footer:
    backgroundColor: "#FFFFFF"
    textColor: "#000000E5"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 16px
      fontWeight: 400
      lineHeight: 24px
    height: 396px
  footer-link:
    textColor: "#000000F2"
    height: 39px
    width: 401px
  footer-link-icon:
    height: 39px
    width: 137px
  footer-inner:
    textColor: "#000000F2"
    typography:
      fontFamily: "\"Lyon Text\", Georgia, YuMincho, \"Yu Mincho\", \"Hiragino Mincho ProN\", \"Hiragino Mincho Pro\", \"Songti TC\", \"Songti SC\", SimSun, \"Nanum Myeongjo\", NanumMyeongjo, Batang, serif"
      fontSize: 16px
      fontWeight: 400
      lineHeight: 24px
  footer-text-2:
    textColor: "#0000008A"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 14px
      fontWeight: 400
      lineHeight: 20px
  footer-nav-item:
    textColor: "#0000008A"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 12px
      fontWeight: 500
      lineHeight: 16px
      letterSpacing: 0.125px
  footer-nav-link:
    textColor: "#000000F2"
    rounded: 8px
  footer-text-3:
    textColor: "#000000E5"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 14px
      fontWeight: 500
      lineHeight: 20px
  footer-group-4:
    textColor: "#00000096"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 14px
      fontWeight: 500
      lineHeight: 20px
  footer-text-4:
    textColor: "#00000096"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 14px
      fontWeight: 500
      lineHeight: 20px
  footer-button:
    backgroundColor: "#FFFFFF"
    textColor: "#000000F2"
    rounded: 9999.01px
  footer-icon:
    size: 20px
  footer-text-5:
    textColor: "#000000F2"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 14px
      fontWeight: 500
      lineHeight: 20px
  footer-button-icon:
    size: 14px
  footer-button-2:
    backgroundColor: transparent
    textColor: "#0000008A"
  footer-text-6:
    textColor: "#0000008A"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 14px
      fontWeight: 400
      lineHeight: 20px
  footer-text-7:
    textColor: "#0000008A"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 14px
      fontWeight: 400
      lineHeight: 20px
  footer-button-focus:
    backgroundColor: "#F6F5F4"
  header-mobile:
    backgroundColor: "#FFFFFF"
    textColor: "#000000E5"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 16px
      fontWeight: 400
      lineHeight: 24px
    height: 64px
  header-mobile-logo:
    textColor: "#000000F2"
    height: 34px
    width: 33px
  header-mobile-logo-icon:
    height: 34px
    width: 33px
  header-mobile-cta:
    backgroundColor: "#0075DE"
    textColor: "#FFFFFF"
    rounded: 8px
  header-mobile-text:
    textColor: "#FFFFFF"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 14px
      fontWeight: 500
      lineHeight: 20px
  header-mobile-menu-toggle:
    backgroundColor: transparent
    textColor: "#000000E5"
    padding: 11px
    size: 44px
  header-mobile-menu-toggle-icon:
    size: 22px
  header-mobile-cta-hover:
    backgroundColor: "#005BAB"
  header-mobile-cta-focus:
    backgroundColor: "#005BAB"
  footer-mobile:
    backgroundColor: "#FFFFFF"
    textColor: "#000000E5"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 16px
      fontWeight: 400
      lineHeight: 24px
    height: 709px
  footer-mobile-link:
    textColor: "#000000F2"
    height: 39px
    width: 358px
  footer-mobile-link-icon:
    height: 39px
    width: 137px
  footer-mobile-nav-item:
    textColor: "#0000008A"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 12px
      fontWeight: 500
      lineHeight: 16px
      letterSpacing: 0.125px
  footer-mobile-nav-link:
    textColor: "#000000F2"
    rounded: 8px
  footer-mobile-text:
    textColor: "#000000E5"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 14px
      fontWeight: 500
      lineHeight: 20px
  footer-mobile-group-2:
    textColor: "#00000096"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 14px
      fontWeight: 500
      lineHeight: 20px
  footer-mobile-text-3:
    textColor: "#00000096"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 14px
      fontWeight: 500
      lineHeight: 20px
  footer-mobile-button:
    backgroundColor: "#FFFFFF"
    textColor: "#000000F2"
    rounded: 9999.01px
  footer-mobile-icon:
    size: 20px
  footer-mobile-text-4:
    textColor: "#000000F2"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 14px
      fontWeight: 500
      lineHeight: 20px
  footer-mobile-button-icon:
    size: 14px
  footer-mobile-button-2:
    backgroundColor: transparent
    textColor: "#0000008A"
  footer-mobile-text-5:
    textColor: "#0000008A"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 14px
      fontWeight: 400
      lineHeight: 20px
  footer-mobile-text-6:
    textColor: "#0000008A"
    typography:
      fontFamily: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
      fontSize: 14px
      fontWeight: 400
      lineHeight: 20px
  footer-mobile-button-focus:
    backgroundColor: "#F6F5F4"
---

# Notion

## Overview

Notion's marketing surface reads like a well-edited document: a pure white canvas, black ink, and a warm-grey supporting cast, with one confident blue that tells you where to click. The personality is calm and trustworthy, then punctuated by whimsy: hand-drawn character illustrations, duotone testimonial portraits and small bursts of amber, coral, green and lavender. None of those accent colors ever does structural work; they decorate cards and badges while the scaffolding stays monochrome.

Hierarchy is made almost entirely by type scale and tracking, not by color or containers. The hero headline is set in `hero-display` (96px, weight 600, -4.6px tracking), and the ladder drops steeply through `display-lg`, `display-md` and `title-md` to a dense 14–16px UI layer. Density is low at the section level, with a 96px vertical rhythm between bands (`section-padding-y`), and moderate inside components, where 14px medium labels and compact ghost buttons keep chrome quiet.

Depth is understated but real: hairline 1px borders at 10% black, a single 1px under-rule on the header, whisper-light layered shadows on product mockups and focused testimonial cards, and a 12px frosted blur on media controls. Geometry is soft and consistent: 8px for buttons, 12px for cards, 4px for ghost controls, full pills for chips.

**Key Characteristics:**
- Near-monochrome: **Ink** (`ink`, #000000) on **Paper White** (`surface`, #FFFFFF), with **Warm Stone** (`surface-warm`, #F6F5F4) for alternating bands.
- One action color: **Notion Blue** (`primary`, #0075DE) for primary CTAs and every focus ring.
- Giant, tightly tracked display type in Notion Inter; negative letter-spacing grows with size.
- Lyon Text serif appears only in testimonial quotes and the footer's editorial line.
- Radii: `rounded.sm` 8px buttons, `rounded.md` 12px cards, `rounded.xs` 4px ghost controls, `rounded.full` pills.
- Elevation by hairlines and multi-layer, very low-opacity shadows, plus `blur(12px)` on media controls.
- Translucent black text tints (e.g. #000000E5 body, #0000008A footer labels) rather than distinct grey hexes inside components.
- Playful illustration accents confined to cards, badges and chips.

## Colors

The palette is a monochrome core with one blue family for interaction and a small set of illustration accents. There are no gradients anywhere in the system; every fill is flat.

### Brand & Interaction Blue
- **Notion Blue** (`primary`, #0075DE): the fill of `button-primary`, `button-primary-2`, `header-cta-2` and `header-mobile-cta`. Text on it is always `on-primary`.
- **Focus Blue** (`primary-focus`, #0075DE): the same hue as the primary fill, used for every focus ring as `2px solid #0075DE` with a 2px offset. Never invent a separate focus color.
- **Link Blue** (`primary-link`, #097FE8): text color of `button-secondary-2` and of inline links inside `card-2` (`card-2-group-2`).
- **Pressed Blue** (`primary-pressed`, #005BAB): hover/focus fill of the primary buttons, and the label color of the tinted `button-secondary`.
- **Blue Mist** (`primary-tint`, #E6F3FE): fill of `button-secondary` and `hero-cta-2`; its hover lightens to #F2F9FF (`button-secondary-hover`).
- **On Primary** (`on-primary`, #FFFFFF): label color on any blue fill.

### Text
- **Ink** (`ink`, #000000): headlines and titles. In components, body copy is usually ink at reduced alpha: #000000E5 for running text and ghost buttons, #000000F2 for links and logos.
- **Warm Graphite** (`body-secondary`, #615D59): secondary descriptive copy.
- **Pebble** (`muted`, #A39E98): tertiary text, meta lines and de-emphasized labels. Footer column headers use the translucent equivalent #0000008A (`footer-nav-item`).

### Surface
- **Paper White** (`surface`, #FFFFFF): page canvas, `header`, `footer`, `card-2`.
- **Warm Stone** (`surface-warm`, #F6F5F4): alternating section bands and the focus fill of `footer-button`. The `card` header block sits on the even subtler #F9F9F8.

### Illustration & Status Accents
- **Marigold** (`accent-amber`, #FFB110) and **Deep Marigold** (`accent-amber-deep`, #E89D01): illustration and portrait duotone fills.
- **Coral** (`accent-coral`, #F64932) and **Signal Red** (`accent-red`, #E32D14): illustration and portrait duotone fills.
- **Ship Green** (`success`, #1AAE39) with **Mint Wash** (`success-tint`, #D0F4D8): the green highlight pill and success-flavored badges.
- **Ultramarine** (`accent-indigo`, #1313BA): small illustration accents only.

### Component & State Colors
These were measured on components, not in the page palette sampling:
- **Hairline Stone** (`hairline`, #DFDCD9): the hover/focus fill of `button-secondary-2` (whose text flips to #000000). Structural borders elsewhere are translucent black (#0000001A), not this hex.
- **Lavender Chip** (`chip-lavender`, #EADBFA): the pill fill of `hero-group` in the hero.
- Ghost hover wash #0000000D (`button-ghost-hover`, `header-link-hover`), also the base fill of `media-control`.

## Typography

### Font Family
- **Notion Inter** (`NotionInter`, falling back to Inter, -apple-system, system-ui, Segoe UI, Helvetica, Arial): the workhorse for everything from the 96px hero to 12px captions.
- **Lyon Text** (falling back to Georgia and CJK Mincho/Songti serifs): reserved for testimonial blockquotes (`card-3-text`) and the footer's editorial line (`footer-inner`). It is a voice, not a second UI font.

### Hierarchy
| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `hero-display` | 96px | 600 | 1.05 | -4.6px | Hero h1 (`hero-title`) |
| `display-lg` | 72px | 500 | 1.2 | -2px | Second hero line / oversized figures (`hero-text-2`) |
| `display-md` | 54px | 700 | 1.05 | -1.87501px | Section h2 headlines |
| `display-sm` | 40px | 400 | 1.5 | normal | Large inline glyph and icon spans |
| `title-lg` | 24px | 500 | 0.85 | normal | Tight-set display labels in strips and graphics |
| `title-md` | 22px | 700 | 1.25 | -0.25px | Card titles (`card-title`) |
| `title-sm` | 20px | 600 | 1.4 | -0.125px | Subheads and badge glyphs (`card-text-2`) |
| `quote` | 18px | 400 | 1.55 | normal | Lyon Text testimonial blockquotes |
| `body` | 16px | 400 | 1.5 | normal | Running text, list items, figcaptions |
| `body-medium` | 16px | 500 | 1.5 | normal | Button roots and emphasized links |
| `body-strong` | 16px | 700 | 1.5 | normal | Small h3s, `card-2-title` |
| `nav-link` | 16px | 400 | 1.5 | normal | Header and footer links |
| `button` | 14px | 500 | 1.45 | normal | Button labels (`button-primary-label`, `header-text`) |
| `body-sm` | 14px | 400 | 1.45 | normal | Card meta text, footer legal lines |
| `caption` | 12px | 500 | 1.35 | 0.125px | Footer column headers (`footer-nav-item`) |

The hero subcopy (`hero-body`) is set at 20px, weight 400, 28px line height, -0.125px tracking.

### Principles
- All four weights exist (400, 500, 600, 700), but they are not ranked uniformly: the 96px hero is 600, the 72px line is 500, the 54px h2 is 700. Pick the token, never a weight on its own.
- Tracking is negative and proportional to size at display scale (-4.6px at 96px, -2px at 72px, -1.87501px at 54px, -0.25px at 22px, -0.125px at 20px), `normal` from 18px down, and slightly positive (0.125px) only on the 12px `caption`.
- Display line heights are tight (1.05–1.2); text sizes open up to 1.45–1.55. `title-lg` at 0.85 is for single-line labels only, never wrapped copy.
- UI labels are 14px medium (`button`); running text is 16px regular (`body`). The button root carries `body-medium` while its label is `button`.

### Note on Font Substitutes
Notion Inter is a proprietary cut; use open-source **Inter** (variable) and keep the token tracking values exactly, since the negative display tracking is calibrated for Inter's metrics. Lyon Text is commercial; substitute **Source Serif 4** or **Newsreader** at the `quote` size and 1.55 line height, or fall back to Georgia as the site's own stack does. Check that the serif's x-height doesn't make 18px quotes read larger than surrounding 16px body.

## Layout

### Spacing System
No `base` step was derived; the spacing tokens restate measured component paddings and the page's section rhythm.

| Token | Value | Measured on |
|---|---|---|
| `section-padding-y` | 96px | Vertical padding between page sections (page-level) |
| `card-2-grid-gap` | 8px | Column gap of the `card-2` link-card grid |
| `button-primary-padding-y` / `-x` | 4px / 14px | `button-primary` (header-sized CTA) |
| `button-primary-2-padding-y` / `-x` | 6px / 15px | `button-primary-2` |
| `button-secondary-padding-y` / `-x` | 6px / 15px | `button-secondary` |
| `button-secondary-2-padding-y` / `-x` | 6px / 15px | `button-secondary-2` |
| `button-ghost-padding-y` / `-x` | 5px / 10px | `button-ghost` |
| `button-ghost-2-padding-y` / `-x` | 5px / 10px | `button-ghost-2` |

`section-padding-y` (96px) is the vertical rhythm between the page's bands, measured on the page itself rather than on a component. Content-sized CTAs use the 6px / 15px pair; the compact header CTA tightens to 4px / 14px; ghost navigation buttons use 5px / 10px.

### Grid & Container
The container max width was not captured as a token, so do not hard-code one. The screenshots show a centered hero with a two-line headline and paired CTAs, then a single left-aligned content container carrying section headings, a grid of feature cards, a full-width card, a row of short link cards packed tightly at `card-2-grid-gap` (8px), a grid of tall testimonial portrait cards, and horizontally running logo and stats strips.

### Whitespace Philosophy
Whitespace lives between sections, not inside them. Bands are separated by the generous `section-padding-y` rhythm, while the link-card row sits shoulder to shoulder at 8px. Let headlines do the spacing work: the oversized display type creates its own breathing room, so resist adding extra containers or dividers around it.

### Measured Layout

Every spacing token restates a measurement of a verified component recipe, or the step those measurements share. `section-padding-y` is measured directly on the page sections and feeds no step.

- `section-padding-y`: 96px (vertical padding repeated on the page sections: 2 section edges on 1 page)
- `card-2-grid-gap`: 8px (`card-2`, column gap of the grid its instances sit in)
- `button-primary-padding-y`: 4px (`button-primary`, vertical padding of the root)
- `button-primary-padding-x`: 14px (`button-primary`, horizontal padding of the root)
- `button-primary-2-padding-y`: 6px (`button-primary-2`, vertical padding of the root)
- `button-primary-2-padding-x`: 15px (`button-primary-2`, horizontal padding of the root)
- `button-secondary-padding-y`: 6px (`button-secondary`, vertical padding of the root)
- `button-secondary-padding-x`: 15px (`button-secondary`, horizontal padding of the root)
- `button-secondary-2-padding-y`: 6px (`button-secondary-2`, vertical padding of the root)
- `button-secondary-2-padding-x`: 15px (`button-secondary-2`, horizontal padding of the root)
- `button-ghost-padding-y`: 5px (`button-ghost`, vertical padding of the root)
- `button-ghost-padding-x`: 10px (`button-ghost`, horizontal padding of the root)
- `button-ghost-2-padding-y`: 5px (`button-ghost-2`, vertical padding of the root)
- `button-ghost-2-padding-x`: 10px (`button-ghost-2`, horizontal padding of the root)

The card-2 grid lays out in 5 columns at desktop.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0, Flat | No shadow; `surface` #FFFFFF or `surface-warm` #F6F5F4 fill | Page canvas, section bands, `footer` |
| 1, Hairline | `1px solid #0000001A` border | `card-2` link cards, `footer-button` pill |
| 1, Under-rule | box-shadow `#0000001A 0px 1px 0px 0px` | Bottom edge of `header` |
| 2, Soft lift | box-shadow `rgba(0, 0, 0, 0.01) 0px 0.175px 1.041px 0px, rgba(0, 0, 0, 0.02) 0px 0.8px 2.925px 0px, rgba(0, 0, 0, 0.027) 0px 2.025px 7.847px 0px, rgba(0, 0, 0, 0.04) 0px 4px 18px 0px` | Floating UI previews on the page; the focus state of `card-3` testimonial cards |
| 3, Deep float | box-shadow `rgba(0, 0, 0, 0.008) 0px 0.667px 3.502px 0px, rgba(0, 0, 0, 0.016) 0px 2.933px 7.252px 0px, rgba(0, 0, 0, 0.02) 0px 7.2px 14.462px 0px, rgba(0, 0, 0, 0.024) 0px 13.867px 28.348px 0px, rgba(0, 0, 0, 0.03) 0px 23.333px 52.123px 0px, rgba(0, 0, 0, 0.04) 0px 36px 89px 0px` | The large product mockup window |
| Frosted | `backdrop-filter: blur(12px)` over a #0000000D wash | `media-control` play/pause buttons over imagery |
| Focus | `outline: 2px solid #0075DE`, offset 2px | Every interactive element on focus |

**Shadow philosophy.** Notion builds depth from many stacked, near-invisible layers rather than one dark drop shadow: the soft tier tops out at 4% black and the deep tier at 4% over an 89px blur, so surfaces feel lifted without ever looking heavy. Hairlines (#0000001A borders and the header's 1px under-rule) handle separation; real shadows are reserved for objects that should feel like floating software, and frosted blur is used where controls sit on top of media. Interactive elements reserve a transparent 2px outline at rest so the blue focus ring appears without layout shift.

## Shapes

### Border Radius Scale
| Token | Value | Use |
|---|---|---|
| `rounded.xs` | 4px | Ghost buttons (`button-ghost`, `button-ghost-2`, `header-cta`), header links (`header-link`) |
| `rounded.sm` | 8px | All filled and tinted buttons (`button-primary`, `button-primary-2`, `button-secondary`, `button-secondary-2`, `hero-cta`), footer links (`footer-nav-link`) |
| `rounded.md` | 12px | Cards: `card-2` link cards, `card-3` testimonial cards |
| `rounded.full` | 9999px | Pills: the lavender hero chip (`hero-group`), the inline link chip in `card-2` (`card-2-group-2`), the bordered `footer-button` |

The geometry is soft but disciplined: radius steps up with object size (4px quiet controls, 8px actions, 12px containers) and never goes sharp. Pills are reserved for chips, tags and the footer's language/selector button, never for primary CTAs, which stay 8px rectangles. Circular shapes appear in illustration and small round icon buttons, not as a radius token beyond `rounded.full`.

## Components

Each component below was distilled from the live page: the recipe is a standalone, placeholder-filled reproduction with literal values, and every frontmatter key named in the anatomy carries the same measurements. A verified component reproduced the original in every check; a flagged one is shipped with the reason it did not; one marked not verifiable could not be compared with the original, which says nothing about the recipe.



### Button, primary

**Verification**: verified against the live page at desktop.

**Anatomy**

- `button-primary`: the component root, a `<a>` (`.c-button-primary`)
- `button-primary-label`: label text, 15 characters (`.c-button-primary__label`)

**Recipe**

```html
<div class="c-button-primary-scope">
  <a class="c-button-primary" href="#">
    <span class="c-button-primary__label">lorem ipsum dol</span>
  </a>
</div>
```

```css
.c-button-primary-scope {
  background-color: #FFFFFF;
  color: #000000E5;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
}

.c-button-primary {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  border-spacing: 0px;
  box-sizing: border-box;
  min-height: 36px;
  padding: 4px 14px;
  background-color: #0075DE;
  color: #FFFFFF;
  border: 1px solid transparent;
  border-radius: 8px;
  outline: 2px solid transparent;
  outline-offset: 2px;
  cursor: pointer;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  text-decoration-line: none;
  text-align: center;
}

.c-button-primary__label {
  display: block;
  box-sizing: border-box;
  font-size: 14px;
  line-height: 20px;
  white-space: nowrap;
}

.c-button-primary:hover {
  background-color: #005BAB;
}

.c-button-primary:focus {
  background-color: #005BAB;
  outline: 2px solid #0075DE;
  outline-offset: 2px;
}
```

**States**

- hover (`button-primary-hover`): background-color #005BAB
- focus (`button-primary-focus`): background-color #005BAB, outline 2px solid #0075DE, outline-offset 2px

### Button, primary (2)

**Verification**: verified against the live page at desktop.

**Anatomy**

- `button-primary-2`: the component root, a `<a>` (`.c-button-primary-2`), 15-character label

**Recipe**

```html
<div class="c-button-primary-2-scope">
  <a class="c-button-primary-2" href="#">lorem ipsum dol</a>
</div>
```

```css
.c-button-primary-2-scope {
  background-color: #FFFFFF;
  color: #000000E5;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
}

.c-button-primary-2 {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  border-spacing: 0px;
  box-sizing: border-box;
  max-width: 280px;
  padding: 6px 15px;
  background-color: #0075DE;
  color: #FFFFFF;
  border: 1px solid transparent;
  border-radius: 8px;
  outline: 2px solid transparent;
  outline-offset: 2px;
  cursor: pointer;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  text-decoration-line: none;
  text-align: center;
  transition-duration: 0.2s;
  transition-timing-function: cubic-bezier(0.42, 0, 1, 1);
  transition-property: background-color, color;
}

.c-button-primary-2:hover {
  background-color: #005BAB;
}

.c-button-primary-2:focus {
  background-color: #005BAB;
  outline: 2px solid #0075DE;
  outline-offset: 2px;
}
```

**States**

- hover (`button-primary-2-hover`): background-color #005BAB
- focus (`button-primary-2-focus`): background-color #005BAB, outline 2px solid #0075DE, outline-offset 2px

### Button, secondary

**Verification**: verified against the live page at desktop.

**Anatomy**

- `button-secondary`: the component root, a `<a>` (`.c-button-secondary`), 14-character label

**Recipe**

```html
<div class="c-button-secondary-scope">
  <a class="c-button-secondary" href="#">lorem ipsum do</a>
</div>
```

```css
.c-button-secondary-scope {
  background-color: #FFFFFF;
  color: #000000E5;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
}

.c-button-secondary {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  border-spacing: 0px;
  box-sizing: border-box;
  max-width: 280px;
  padding: 6px 15px;
  background-color: #E6F3FE;
  color: #005BAB;
  border: 1px solid transparent;
  border-radius: 8px;
  outline: 2px solid transparent;
  outline-offset: 2px;
  cursor: pointer;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  text-decoration-line: none;
  text-align: center;
  transition-duration: 0.2s;
  transition-timing-function: cubic-bezier(0.42, 0, 1, 1);
  transition-property: background-color, color;
}

.c-button-secondary:hover {
  background-color: #F2F9FF;
}

.c-button-secondary:focus {
  background-color: #F2F9FF;
  outline: 2px solid #0075DE;
  outline-offset: 2px;
}
```

**States**

- hover (`button-secondary-hover`): background-color #F2F9FF
- focus (`button-secondary-focus`): background-color #F2F9FF, outline 2px solid #0075DE, outline-offset 2px

### Button, secondary (2)

**Verification**: verified against the live page at desktop.

**Anatomy**

- `button-secondary-2`: the component root, a `<a>` (`.c-button-secondary-2`), 14-character label

**Recipe**

```html
<div class="c-button-secondary-2-scope">
  <a class="c-button-secondary-2" href="#">lorem ipsum do</a>
</div>
```

```css
.c-button-secondary-2-scope {
  background-color: #F6F5F4;
  color: #000000E5;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
}

.c-button-secondary-2 {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  border-spacing: 0px;
  box-sizing: border-box;
  padding: 6px 15px;
  background-color: #FFFFFF;
  color: #097FE8;
  border: 1px solid transparent;
  border-radius: 8px;
  outline: 2px solid transparent;
  outline-offset: 2px;
  cursor: pointer;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  text-decoration-line: none;
  text-align: center;
  transition-duration: 0.2s;
  transition-timing-function: cubic-bezier(0.42, 0, 1, 1);
  transition-property: background-color, color;
}

.c-button-secondary-2:hover {
  background-color: #DFDCD9;
  color: #000000;
}

.c-button-secondary-2:focus {
  background-color: #DFDCD9;
  color: #000000;
  outline: 2px solid #0075DE;
  outline-offset: 2px;
}
```

**States**

- hover (`button-secondary-2-hover`): background-color #DFDCD9, color #000000
- focus (`button-secondary-2-focus`): background-color #DFDCD9, color #000000, outline 2px solid #0075DE, outline-offset 2px

### Button, ghost

**Verification**: verified against the live page at desktop.

**Anatomy**

- `button-ghost`: the component root, a `<button>` (`.c-button-ghost`)
- `button-ghost-label`: label text, 7 characters (`.c-button-ghost__label`)
- `button-ghost-icon`: icon placeholder, 10px (`.c-button-ghost__icon`)

**Recipe**

```html
<div class="c-button-ghost-scope">
  <button class="c-button-ghost" type="button">
    <span class="c-button-ghost__label">lorem i</span>
    <span class="c-button-ghost__icon" aria-hidden="true"></span>
  </button>
</div>
```

```css
.c-button-ghost-scope {
  background-color: #FFFFFF;
  color: #000000E5;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
}

.c-button-ghost {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  gap: 8px;
  border-spacing: 0px;
  box-sizing: border-box;
  padding: 5px 10px;
  background-color: transparent;
  color: #000000E5;
  border: 0;
  border-radius: 4px;
  outline: 2px solid transparent;
  outline-offset: 2px;
  cursor: pointer;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
  letter-spacing: normal;
  text-transform: none;
  text-align: center;
  white-space: nowrap;
  appearance: button;
  transition: background-color 0.15s ease;
}

.c-button-ghost__label {
  display: block;
  box-sizing: border-box;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}

.c-button-ghost__icon {
  display: block;
  flex-shrink: 0;
  box-sizing: border-box;
  width: 10px;
  height: 10px;
  overflow-x: hidden;
  overflow-y: hidden;
  background-color: currentcolor;
}

.c-button-ghost:hover {
  background-color: #0000000D;
}

.c-button-ghost:focus {
  outline: 2px solid #0075DE;
  outline-offset: 2px;
}
```

**States**

- hover (`button-ghost-hover`): background-color #0000000D
- focus: outline 2px solid #0075DE, outline-offset 2px

### Button, ghost (2)

**Verification**: verified against the live page at desktop.

**Anatomy**

- `button-ghost-2`: the component root, a `<button>` (`.c-button-ghost-2`)
- `button-ghost-2-label`: label text, 9 characters (`.c-button-ghost-2__label`)
- `button-ghost-2-icon`: icon placeholder, 10px (`.c-button-ghost-2__icon`)

**Recipe**

```html
<div class="c-button-ghost-2-scope">
  <button class="c-button-ghost-2" type="button">
    <span class="c-button-ghost-2__label">lorem ips</span>
    <span class="c-button-ghost-2__icon" aria-hidden="true"></span>
  </button>
</div>
```

```css
.c-button-ghost-2-scope {
  background-color: #FFFFFF;
  color: #000000E5;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
}

.c-button-ghost-2 {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  gap: 8px;
  border-spacing: 0px;
  box-sizing: border-box;
  padding: 5px 10px;
  background-color: transparent;
  color: #000000E5;
  border: 0;
  border-radius: 4px;
  outline: 2px solid transparent;
  outline-offset: 2px;
  cursor: pointer;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
  letter-spacing: normal;
  text-transform: none;
  text-align: center;
  white-space: nowrap;
  appearance: button;
  transition: background-color 0.15s ease;
}

.c-button-ghost-2__label {
  display: block;
  box-sizing: border-box;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}

.c-button-ghost-2__icon {
  display: block;
  flex-shrink: 0;
  box-sizing: border-box;
  width: 10px;
  height: 10px;
  overflow-x: hidden;
  overflow-y: hidden;
  background-color: currentcolor;
}

.c-button-ghost-2:hover {
  background-color: #0000000D;
}

.c-button-ghost-2:focus {
  outline: 2px solid #0075DE;
  outline-offset: 2px;
}
```

**States**

- hover (`button-ghost-2-hover`): background-color #0000000D
- focus: outline 2px solid #0075DE, outline-offset 2px

### Card

**Verification**: verified against the live page at desktop.

**Anatomy**

- `card`: the component root, a `<header>` (`.c-card`)
- `card-text`: label text, 17 characters (`.c-card__text`)
- `card-group`: inner flex row (`.c-card__group`)
- `card-title`: heading, 43 characters (`.c-card__title`)
- `card-text-2`: label text, 1 characters (`.c-card__text-2`)

**Recipe**

```html
<div class="c-card-scope">
  <header class="c-card">
    <div class="c-card__text">lorem ipsum dolor</div>
    <div class="c-card__group">
      <h2 class="c-card__title">lorem ipsum dolor sit amet consectetur adip</h2>
      <span class="c-card__text-2">l</span>
    </div>
  </header>
</div>
```

```css
.c-card-scope {
  background-color: #FFFFFF;
  color: #000000E5;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
}

.c-card {
  display: inline-flex;
  flex-direction: column;
  flex-grow: 1;
  flex-basis: 0%;
  gap: 8px;
  border-spacing: 0px;
  box-sizing: border-box;
  padding: 24px;
  background-color: #F9F9F8;
  color: #000000E5;
  cursor: default;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
}

.c-card__text {
  display: flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  font-size: 14px;
  line-height: 20px;
}

.c-card__group {
  display: flex;
  gap: 8px;
  box-sizing: border-box;
}

.c-card__title {
  display: block;
  box-sizing: border-box;
  margin: 0px;
  color: #000000;
  font-size: 22px;
  font-weight: 700;
  line-height: 28px;
  letter-spacing: -0.25px;
}

.c-card__text-2 {
  display: flex;
  justify-content: center;
  align-items: center;
  align-self: flex-end;
  flex-shrink: 0;
  box-sizing: border-box;
  width: 32px;
  height: 32px;
  background-color: #000000;
  color: #FFFFFF;
  border-radius: 100%;
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
  letter-spacing: -0.125px;
  margin-left: auto;
}
```

**States**

- No hover or focus change was observed.

### Card (2)

**Verification**: verified against the live page at desktop.

**Anatomy**

- Group: 5 instances in a 5-column grid, 8px gap; the recipe carries the values they all share
- `card-2`: the component root, a `<div>` (`.c-card-2`)
- `card-2-link`: link (`.c-card-2__link`)
- `card-2-group`: inner block (`.c-card-2__group`)
- `card-2-group-2`: inner grid (`.c-card-2__group-2`)
- `card-2-media`: image placeholder, 40px (`.c-card-2__media`)
- `card-2-title`: heading, 0 characters (`.c-card-2__title`)
- `card-2-text`: label text, 23 characters (`.c-card-2__text`)
- `card-2-text-2`: label text, 1 characters (`.c-card-2__text-2`)

**Recipe**

```html
<div class="c-card-2-scope">
  <div class="c-card-2">
    <a class="c-card-2__link" href="#"></a>
    <div class="c-card-2__group">
      <span class="c-card-2__group-2">
        <span class="c-card-2__media" aria-hidden="true"></span>
      </span>
    </div>
    <h3 class="c-card-2__title">
      <span class="c-card-2__text">lorem ipsum dolor sit a</span>
      <span class="c-card-2__text-2">l</span>
    </h3>
  </div>
</div>
```

```css
.c-card-2-scope {
  background-color: #FFFFFF;
  color: #000000E5;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
}

.c-card-2 {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: start;
  align-items: start;
  gap: 16px;
  border-spacing: 0px;
  box-sizing: border-box;
  padding: 24px;
  position: relative;
  background-color: #FFFFFF;
  color: #000000E5;
  border: 1px solid #0000001A;
  border-radius: 12px;
  outline: 2px solid transparent;
  outline-offset: 2px;
  cursor: default;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
  transition: outline-color 0.2s cubic-bezier(0.42, 0, 1, 1);
}

.c-card-2__link {
  display: block;
  box-sizing: border-box;
  position: absolute;
  top: 0px;
  right: 0px;
  bottom: 0px;
  left: 0px;
  color: #000000F2;
  cursor: pointer;
  text-decoration-line: none;
}

.c-card-2__group {
  display: block;
  box-sizing: border-box;
  position: relative;
}

.c-card-2__group-2 {
  display: inline-grid;
  align-items: center;
  box-sizing: border-box;
  width: 40px;
  min-width: fit-content;
  aspect-ratio: 1 / 1;
  color: #097FE8;
  border-radius: 9999.01px;
  font-size: 40px;
  line-height: 60px;
  transition: background-color 0.2s cubic-bezier(0.42, 0, 1, 1);
}

.c-card-2__media {
  display: block;
  flex-shrink: 0;
  box-sizing: border-box;
  width: 40px;
  height: 40px;
  aspect-ratio: auto 48 / 48;
  overflow-x: clip;
  overflow-y: clip;
  background-color: currentcolor;
}

.c-card-2__title {
  display: block;
  box-sizing: border-box;
  width: 100%;
  margin: 0px;
  color: #000000;
  font-size: 16px;
  font-weight: 700;
}

.c-card-2__text-2 {
  display: inline-block;
  box-sizing: border-box;
  margin-left: 4px;
}

.c-card-2:focus::after {
  content: "";
  display: block;
  box-sizing: border-box;
  width: 237px;
  height: 158px;
  position: absolute;
  top: 0px;
  right: 0px;
  bottom: 0px;
  left: 0px;
  border-radius: 12px;
  box-shadow: #00000003 0px 0.175px 1.041px 0px, #00000005 0px 0.8px 2.925px 0px, #00000007 0px 2.025px 7.847px 0px, #0000000A 0px 4px 18px 0px;
  opacity: 0;
}
```

**States**

- focus: ::after content "", ::after display block, ::after box-sizing border-box, ::after width 237px, ::after height 158px, ::after position absolute, ::after top 0px, ::after right 0px, ::after bottom 0px, ::after left 0px, ::after border-radius 12px, ::after box-shadow #00000003 0px 0.175px 1.041px 0px, #00000005 0px 0.8px 2.925px 0px, #00000007 0px 2.025px 7.847px 0px, #0000000A 0px 4px 18px 0px, ::after opacity 0

### Card (3)

**Verification**: flagged, the render matched 4% of the original pixels, below the 96% required (instance 1) after 2 correction attempts.

**Anatomy**

- Group: 3 instances in a 3-column grid, 24px gap; the recipe carries the values they all share
- `card-3`: the component root, a `<a>` (`.c-card-3`)
- `card-3-media`: image placeholder, 394x492px (`.c-card-3__media`)
- `card-3-group`: inner group (`.c-card-3__group`)
- `card-3-group-2`: inner group (`.c-card-3__group-2`)
- `card-3-group-3`: inner group (`.c-card-3__group-3`)
- `card-3-group-4`: inner flex column (`.c-card-3__group-4`)
- `card-3-media-2`: image placeholder, 87x25px (`.c-card-3__media-2`)
- `card-3-group-5`: inner flex column (`.c-card-3__group-5`)
- `card-3-text`: label text, 120 characters (`.c-card-3__text`)
- `card-3-group-6`: inner block (`.c-card-3__group-6`), content not captured

**Recipe**

```html
<div class="c-card-3-scope">
  <a class="c-card-3" href="#">
    <span class="c-card-3__media" aria-hidden="true"></span>
    <span class="c-card-3__group"></span>
    <span class="c-card-3__group-2"></span>
    <span class="c-card-3__group-3"></span>
    <div class="c-card-3__group-4">
      <span class="c-card-3__media-2" aria-hidden="true"></span>
      <figure class="c-card-3__group-5">
        <div class="c-card-3__text">lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor lorem ipsum dolor sit amet consectetur adip</div>
        <div class="c-card-3__group-6"></div>
      </figure>
    </div>
  </a>
</div>
```

```css
.c-card-3-scope {
  background-color: #FFFFFF;
  color: #000000E5;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
}

.c-card-3 {
  display: inline-grid;
  flex-shrink: 0;
  border-spacing: 0px;
  box-sizing: border-box;
  position: relative;
  overflow-x: hidden;
  overflow-y: hidden;
  color: #FFFFFF;
  border-radius: 12px;
  outline: 2px solid transparent;
  outline-offset: 2px;
  cursor: pointer;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
  text-decoration-line: none;
  transition: box-shadow 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
}

.c-card-3__media {
  display: block;
  flex-shrink: 0;
  box-sizing: border-box;
  width: 394px;
  height: 492px;
  aspect-ratio: auto 1200 / 1500;
  position: absolute;
  top: 0px;
  right: 0px;
  bottom: 0px;
  left: 0px;
  z-index: 0;
  overflow-x: clip;
  overflow-y: clip;
  background-color: currentcolor;
  transition: transform 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
}

.c-card-3__group {
  display: block;
  box-sizing: border-box;
  position: absolute;
  top: 0px;
  right: 0px;
  bottom: 0px;
  left: 0px;
  z-index: 1;
  opacity: 0.42;
}

.c-card-3__group-2 {
  display: block;
  box-sizing: border-box;
  position: absolute;
  top: 0px;
  right: 0px;
  bottom: 0px;
  left: 0px;
  z-index: 2;
  opacity: 0.8;
}

.c-card-3__group-3 {
  display: block;
  box-sizing: border-box;
  position: absolute;
  top: 0px;
  right: 0px;
  bottom: 0px;
  left: 0px;
  z-index: 3;
  background-image: linear-gradient(transparent 35%, #0000008C 100%);
}

.c-card-3__group-4 {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 16px;
  box-sizing: border-box;
  padding: 24px;
  position: relative;
  z-index: 4;
}

.c-card-3__media-2 {
  display: block;
  flex-shrink: 0;
  box-sizing: border-box;
  width: 87px;
  height: 25px;
  max-height: 32px;
  overflow-x: clip;
  overflow-y: clip;
  background-color: currentcolor;
}

.c-card-3__group-5 {
  display: flex;
  flex-direction: column;
  align-items: start;
  row-gap: 8px;
  box-sizing: border-box;
  margin: 0px;
}

.c-card-3__text {
  display: block;
  box-sizing: border-box;
  width: 100%;
  margin: 0px;
  font-family: "Lyon Text", Georgia, YuMincho, "Yu Mincho", "Hiragino Mincho ProN", "Hiragino Mincho Pro", "Songti TC", "Songti SC", SimSun, "Nanum Myeongjo", NanumMyeongjo, Batang, serif;
  font-size: 18px;
  line-height: 28px;
}

.c-card-3__text::before {
  content: "";
  display: inline;
  box-sizing: border-box;
}

.c-card-3__text::after {
  content: "";
  display: inline;
  box-sizing: border-box;
}

.c-card-3__group-6 {
  display: block;
  box-sizing: border-box;
  position: relative;
  font-size: 14px;
  line-height: 20px;
}

.c-card-3:focus {
  box-shadow: #00000003 0px 0.175px 1.041px 0px, #00000005 0px 0.8px 2.925px 0px, #00000007 0px 2.025px 7.847px 0px, #0000000A 0px 4px 18px 0px;
  outline: 2px solid #0075DE;
  outline-offset: 2px;
}

.c-card-3:focus::before {
  content: "";
  display: block;
  box-sizing: border-box;
  width: 394px;
  height: 492px;
  padding-top: 491.984px;
}
```

**States**

- focus: box-shadow #00000003 0px 0.175px 1.041px 0px, #00000005 0px 0.8px 2.925px 0px, #00000007 0px 2.025px 7.847px 0px, #0000000A 0px 4px 18px 0px, outline 2px solid #0075DE, outline-offset 2px, ::before content "", ::before display block, ::before box-sizing border-box, ::before width 394px, ::before height 492px, ::before padding-top 491.984px

### Hero

**Verification**: flagged, the `hero-text` height did not reproduce the measured 216px after 2 correction attempts.

**Anatomy**

- `hero`: the component root, a `<header>` (`.c-hero`)
- `hero-title`: heading, 0 characters (`.c-hero__title`)
- `hero-text`: label text, 22 characters (`.c-hero__text`, 2 instances)
- `hero-group`: inner flex row (`.c-hero__group`)
- `hero-group-2`: inner group (`.c-hero__group-2`)
- `hero-text-2`: label text, 3 characters (`.c-hero__text-2`)
- `hero-body`: label text, 78 characters (`.c-hero__body`)
- `hero-group-3`: inner grid (`.c-hero__group-3`)
- `hero-cta`: link, 15-character label (`.c-hero__cta`)
- `hero-cta-2`: link, 14-character label (`.c-hero__cta-2`)

**Recipe**

```html
<div class="c-hero-scope">
  <header class="c-hero">
    <h1 class="c-hero__title">
      <span class="c-hero__text">lorem ipsum dolor sit</span>
      <span class="c-hero__group">
        <span class="c-hero__group-2">
          <span class="c-hero__text-2">lor</span>
        </span>
      </span>
      <span class="c-hero__text">lorem ips</span>
    </h1>
    <p class="c-hero__body">lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor l</p>
    <div class="c-hero__group-3">
      <a class="c-hero__cta" href="#">lorem ipsum dol</a>
      <a class="c-hero__cta-2" href="#">lorem ipsum do</a>
    </div>
  </header>
</div>
```

```css
.c-hero-scope {
  background-color: #FFFFFF;
  color: #000000E5;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
}

.c-hero {
  display: block;
  border-spacing: 0px;
  box-sizing: border-box;
  color: #000000E5;
  cursor: default;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
  text-align: center;
}

.c-hero__title {
  display: block;
  box-sizing: border-box;
  margin: 0px 0px 12px;
  color: #000000F2;
  font-size: 96px;
  font-weight: 600;
  line-height: 100px;
  letter-spacing: -4.6px;
}

.c-hero__group {
  display: inline-flex;
  align-items: baseline;
  gap: 12px;
  box-sizing: border-box;
  padding: 8px 28px;
  background-color: #EADBFA;
  border-radius: 9999.01px;
  font-size: 72px;
  font-weight: 500;
  line-height: 87.12px;
  letter-spacing: -2px;
}

.c-hero__group::before {
  content: "";
  display: block;
  align-self: center;
  box-sizing: border-box;
  width: 32px;
  height: 32px;
  background-color: #9849E8;
  border-radius: 9999.01px;
}

.c-hero__group-2 {
  display: block;
  box-sizing: border-box;
  width: 138px;
  overflow-x: hidden;
  overflow-y: hidden;
  white-space: nowrap;
  transition: inline-size 0.3s cubic-bezier(0.86, 0, 0.07, 1);
}

.c-hero__text-2 {
  display: inline-block;
  box-sizing: border-box;
}

.c-hero__body {
  display: block;
  box-sizing: border-box;
  margin: 0px 0px 20px;
  font-size: 20px;
  line-height: 28px;
  letter-spacing: -0.125px;
}

.c-hero__group-3 {
  display: grid;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
  grid-template-columns: 1fr 1fr;
  box-sizing: border-box;
  width: max-content;
  max-width: 100%;
  margin-right: auto;
  margin-left: auto;
}

.c-hero__cta {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  box-sizing: border-box;
  max-width: 280px;
  padding: 6px 15px;
  background-color: #0075DE;
  color: #FFFFFF;
  border: 1px solid transparent;
  border-radius: 8px;
  outline: 2px solid transparent;
  outline-offset: 2px;
  cursor: pointer;
  font-weight: 500;
  text-decoration-line: none;
  transition-duration: 0.2s;
  transition-timing-function: cubic-bezier(0.42, 0, 1, 1);
  transition-property: background-color, color;
}

.c-hero__cta-2 {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  box-sizing: border-box;
  max-width: 280px;
  padding: 6px 15px;
  background-color: #E6F3FE;
  color: #005BAB;
  border: 1px solid transparent;
  border-radius: 8px;
  outline: 2px solid transparent;
  outline-offset: 2px;
  cursor: pointer;
  font-weight: 500;
  text-decoration-line: none;
  transition-duration: 0.2s;
  transition-timing-function: cubic-bezier(0.42, 0, 1, 1);
  transition-property: background-color, color;
}
```

**States**

- No hover or focus change was observed.

### Footer navigation

**Verification**: verified against the live page at desktop.

**Anatomy**

- `footer-navigation`: the component root, a `<nav>` (`.c-footer-navigation`), content not captured
- `footer-navigation-list`: inner flex column (`.c-footer-navigation__list`, 2 instances), content not captured
- `footer-navigation-item`: label text, 7 characters (`.c-footer-navigation__item`, 2 instances)
- `footer-navigation-item-2`: inner group (`.c-footer-navigation__item-2`, 11 instances)
- `footer-navigation-link`: link (`.c-footer-navigation__link`, 12 instances), content not captured
- `footer-navigation-text`: label text, 8 characters (`.c-footer-navigation__text`, 10 instances)
- `footer-navigation-item-3`: inner group (`.c-footer-navigation__item-3`)
- `footer-navigation-text-2`: label text, 12 characters (`.c-footer-navigation__text-2`), content not captured

**Recipe**

```html
<div class="c-footer-navigation-scope">
  <nav class="c-footer-navigation">
    <ul class="c-footer-navigation__list">
      <li class="c-footer-navigation__item">lorem i</li>
      <li class="c-footer-navigation__item-2">
        <a class="c-footer-navigation__link" href="#">
          <span class="c-footer-navigation__text">lorem ip</span>
        </a>
      </li>
      <li class="c-footer-navigation__item-2">
        <a class="c-footer-navigation__link" href="#">
          <span class="c-footer-navigation__text">lorem ipsu</span>
        </a>
      </li>
      <li class="c-footer-navigation__item-2">
        <a class="c-footer-navigation__link" href="#">
          <span class="c-footer-navigation__text">lorem ips</span>
        </a>
      </li>
      <li class="c-footer-navigation__item-2">
        <a class="c-footer-navigation__link" href="#">
          <span class="c-footer-navigation__text">lorem i</span>
        </a>
      </li>
      <li class="c-footer-navigation__item-2">
        <a class="c-footer-navigation__link" href="#">
          <span class="c-footer-navigation__text">lorem ipsum do</span>
        </a>
      </li>
      <li class="c-footer-navigation__item-2">
        <a class="c-footer-navigation__link" href="#">
          <span class="c-footer-navigation__text">lorem ip</span>
        </a>
      </li>
      <li class="c-footer-navigation__item-3">
        <a class="c-footer-navigation__link" href="#">
          <span class="c-footer-navigation__text-2">lorem ipsum</span>
        </a>
      </li>
    </ul>
    <ul class="c-footer-navigation__list">
      <li class="c-footer-navigation__item">lorem ips</li>
      <li class="c-footer-navigation__item-2">
        <a class="c-footer-navigation__link" href="#">
          <span class="c-footer-navigation__text">lorem ipsum dolo</span>
        </a>
      </li>
      <li class="c-footer-navigation__item-2">
        <a class="c-footer-navigation__link" href="#">
          <span class="c-footer-navigation__text">lorem ipsum</span>
        </a>
      </li>
      <li class="c-footer-navigation__item-2">
        <a class="c-footer-navigation__link" href="#">
          <span class="c-footer-navigation__text">lorem ipsum</span>
        </a>
      </li>
      <li class="c-footer-navigation__item-2">
        <a class="c-footer-navigation__link" href="#">
          <span class="c-footer-navigation__text">lorem ipsum</span>
        </a>
      </li>
      <li class="c-footer-navigation__item-2">
        <a class="c-footer-navigation__link" href="#"></a>
      </li>
    </ul>
  </nav>
</div>
```

```css
.c-footer-navigation-scope {
  background-color: #FFFFFF;
  color: #000000E5;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
}

.c-footer-navigation {
  display: inline-grid;
  gap: 80px 24px;
  grid-template-columns: repeat(4, minmax(0px, 1fr));
  border-spacing: 0px;
  box-sizing: border-box;
  color: #000000E5;
  cursor: default;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
}

.c-footer-navigation__list {
  display: flex;
  flex-direction: column;
  justify-content: start;
  box-sizing: border-box;
  width: 100%;
  padding: 0px;
  margin: 0px;
  list-style-type: disc;
}

.c-footer-navigation__item {
  display: list-item;
  box-sizing: border-box;
  color: #0000008A;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  letter-spacing: 0.125px;
  list-style-type: none;
  padding-right: 8px;
  padding-bottom: 8px;
  padding-left: 8px;
  margin-right: -8px;
  margin-left: -8px;
}

.c-footer-navigation__item-2 {
  display: list-item;
  box-sizing: border-box;
  width: fit-content;
  list-style-type: none;
  margin-right: -8px;
  margin-left: -8px;
}

.c-footer-navigation__link {
  display: grid;
  align-items: center;
  column-gap: 8px;
  grid-template-columns: 1fr;
  grid-template-rows: auto;
  box-sizing: border-box;
  width: 100%;
  padding: 3px 16px 3px 8px;
  color: #000000F2;
  border-radius: 8px;
  outline: 2px solid transparent;
  outline-offset: 2px;
  cursor: pointer;
  text-decoration-line: none;
}

.c-footer-navigation__text {
  display: block;
  align-self: center;
  box-sizing: border-box;
  color: #000000E5;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  text-decoration-line: underline;
  text-decoration-color: transparent;
  transition: text-decoration-color 0.2s cubic-bezier(0.42, 0, 1, 1);
}

.c-footer-navigation__item-3 {
  display: list-item;
  box-sizing: border-box;
  width: fit-content;
  list-style-type: none;
  margin-top: 8px;
  margin-right: -8px;
  margin-left: -8px;
}

.c-footer-navigation__text-2 {
  display: block;
  align-self: center;
  box-sizing: border-box;
  color: #00000096;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  text-decoration-line: underline;
  text-decoration-color: transparent;
  transition: text-decoration-color 0.2s cubic-bezier(0.42, 0, 1, 1);
}
```

**States**

- No hover or focus change was observed.

### Media control

**Verification**: verified against the live page at desktop.

**Anatomy**

- `media-control`: the component root, a `<button>` (`.c-media-control`)
- `media-control-group`: inner flex row (`.c-media-control__group`)
- `media-control-icon`: icon placeholder, 12px (`.c-media-control__icon`)
- `media-control-text`: label text, 5 characters (`.c-media-control__text`)

**Recipe**

```html
<div class="c-media-control-scope">
  <button class="c-media-control" type="button">
    <span class="c-media-control__group">
      <span class="c-media-control__icon" aria-hidden="true"></span>
    </span>
    <span class="c-media-control__text">lorem</span>
  </button>
</div>
```

```css
.c-media-control-scope {
  background-color: #FFFFFF;
  color: #000000E5;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
}

.c-media-control {
  display: flex;
  justify-content: center;
  align-items: center;
  border-spacing: 0px;
  box-sizing: border-box;
  width: 32px;
  height: 32px;
  padding: 0px;
  position: absolute;
  bottom: 12px;
  left: 12px;
  z-index: 1;
  background-color: #0000000D;
  color: #FFFFFF;
  border: 0;
  border-radius: 50%;
  backdrop-filter: blur(12px);
  outline: 2px solid transparent;
  outline-offset: 2px;
  cursor: pointer;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
  letter-spacing: normal;
  text-transform: none;
  text-align: center;
  appearance: button;
  transition: all 0.2s ease;
}

.c-media-control__group {
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  width: 12px;
  height: 12px;
}

.c-media-control__icon {
  display: block;
  flex-shrink: 0;
  box-sizing: border-box;
  width: 12px;
  height: 12px;
  overflow-x: hidden;
  overflow-y: hidden;
  background-color: currentcolor;
}

.c-media-control__text {
  display: block;
  box-sizing: border-box;
  width: 1px;
  height: 1px;
  position: absolute;
  overflow-x: hidden;
  overflow-y: hidden;
  white-space: nowrap;
}

.c-media-control:focus {
  outline: 2px solid #0075DE;
  outline-offset: 2px;
}
```

**States**

- focus: outline 2px solid #0075DE, outline-offset 2px

### Header

**Verification**: desktop flagged, the `header-logo` width did not reproduce the measured 33px after 2 correction attempts; mobile flagged, the `header-mobile-logo` width did not reproduce the measured 33px after 2 correction attempts.

**Anatomy**

- `header`: the component root, a `<nav>` (`.c-header`)
- `header-group`: inner grid (`.c-header__group`)
- `header-logo`: link (`.c-header__logo`)
- `header-logo-icon`: icon placeholder, 33x34px (`.c-header__logo-icon`)
- `header-group-2`: inner flex row (`.c-header__group-2`)
- `header-group-3`: inner block (`.c-header__group-3`, 2 instances)
- `header-cta`: the `button-ghost` button (`.c-header__cta`, 2 instances)
- `header-text`: label text, 7 characters (`.c-header__text`, 5 instances)
- `header-cta-icon`: icon placeholder, 10px (`.c-header__cta-icon`, 2 instances)
- `header-link`: link (`.c-header__link`, 3 instances)
- `header-group-4`: inner flex row (`.c-header__group-4`)
- `header-group-5`: inner flex row (`.c-header__group-5`)
- `header-group-6`: inner flex row (`.c-header__group-6`)
- `header-cta-2`: the `button-primary` button (`.c-header__cta-2`)
- `header-text-2`: label text, 15 characters (`.c-header__text-2`)

**Desktop recipe**

```html
<div class="c-header-scope">
  <nav class="c-header">
    <div class="c-header__group">
      <a class="c-header__logo" href="#">
        <span class="c-header__logo-icon" aria-hidden="true"></span>
      </a>
      <div class="c-header__group-2">
        <div class="c-header__group-3">
          <button class="c-header__cta" type="button">
            <span class="c-header__text">lorem i</span>
            <span class="c-header__cta-icon" aria-hidden="true"></span>
          </button>
        </div>
        <div class="c-header__group-3">
          <button class="c-header__cta" type="button">
            <span class="c-header__text">lorem ips</span>
            <span class="c-header__cta-icon" aria-hidden="true"></span>
          </button>
        </div>
        <a class="c-header__link" href="#">
          <span class="c-header__text">lorem i</span>
        </a>
        <a class="c-header__link" href="#">
          <span class="c-header__text">lorem ipsum do</span>
        </a>
      </div>
      <div class="c-header__group-4">
        <span class="c-header__group-5">
          <a class="c-header__link" href="#">
            <span class="c-header__text">lorem</span>
          </a>
        </span>
        <span class="c-header__group-6">
          <a class="c-header__cta-2" href="#">
            <span class="c-header__text-2">lorem ipsum dol</span>
          </a>
        </span>
      </div>
    </div>
  </nav>
</div>
```

```css
.c-header-scope {
  background-color: #FFFFFF;
  color: #000000E5;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
}

.c-header {
  display: grid;
  align-items: center;
  border-spacing: 0px;
  box-sizing: border-box;
  min-height: 64px;
  position: relative;
  top: 0px;
  right: 0px;
  left: 0px;
  z-index: 100;
  background-color: #FFFFFF;
  color: #000000E5;
  box-shadow: #0000001A 0px 1px 0px 0px;
  cursor: default;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
  transition: box-shadow 0.2s cubic-bezier(0.42, 0, 1, 1);
}

.c-header__group {
  display: grid;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  grid-template-columns: 1fr auto 1fr;
  box-sizing: border-box;
  width: 100%;
  padding: 14px 24px;
  overflow-x: auto;
  overflow-y: auto;
  margin-right: auto;
  margin-left: auto;
}

.c-header__logo {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  max-height: 36px;
  color: #000000F2;
  outline: 2px solid transparent;
  outline-offset: 2px;
  cursor: pointer;
  text-decoration-line: none;
}

.c-header__logo-icon {
  display: block;
  flex-shrink: 0;
  box-sizing: border-box;
  width: 33px;
  height: 34px;
  overflow-x: hidden;
  overflow-y: hidden;
  background-color: currentcolor;
  transform: matrix(1, 0, 0, 1, -2, 0);
}

.c-header__group-2 {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  box-sizing: border-box;
}

.c-header__group-3 {
  display: block;
  box-sizing: border-box;
}

.c-header__group-3::after {
  content: "";
  display: block;
  box-sizing: border-box;
  width: 1440px;
  height: 30px;
  position: absolute;
  top: 47px;
  right: 0px;
  bottom: -13px;
  left: 0px;
  z-index: 99;
}

.c-header__cta {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  gap: 8px;
  box-sizing: border-box;
  padding: 5px 10px;
  background-color: transparent;
  color: #000000E5;
  border: 0;
  border-radius: 4px;
  outline: 2px solid transparent;
  outline-offset: 2px;
  cursor: pointer;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
  letter-spacing: normal;
  text-transform: none;
  text-align: center;
  white-space: nowrap;
  appearance: button;
  transition: background-color 0.15s ease;
}

.c-header__text {
  display: block;
  box-sizing: border-box;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}

.c-header__cta-icon {
  display: block;
  flex-shrink: 0;
  box-sizing: border-box;
  width: 10px;
  height: 10px;
  overflow-x: hidden;
  overflow-y: hidden;
  background-color: currentcolor;
}

.c-header__link {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  gap: 8px;
  box-sizing: border-box;
  padding: 5px 10px;
  color: #000000E5;
  border-radius: 4px;
  outline: 2px solid transparent;
  outline-offset: 2px;
  cursor: pointer;
  text-decoration-line: none;
  white-space: nowrap;
  transition: background-color 0.15s ease;
}

.c-header__group-4 {
  display: flex;
  align-items: center;
  gap: 16px;
  box-sizing: border-box;
}

.c-header__group-5 {
  display: flex;
  align-items: center;
  gap: 12px;
  box-sizing: border-box;
}

.c-header__group-6 {
  display: flex;
  box-sizing: border-box;
}

.c-header__cta-2 {
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  min-height: 36px;
  padding: 4px 14px;
  background-color: #0075DE;
  color: #FFFFFF;
  border: 1px solid transparent;
  border-radius: 8px;
  outline: 2px solid transparent;
  outline-offset: 2px;
  cursor: pointer;
  font-weight: 500;
  text-decoration-line: none;
  text-align: center;
}

.c-header__text-2 {
  display: block;
  box-sizing: border-box;
  font-size: 14px;
  line-height: 20px;
  white-space: nowrap;
}

.c-header__logo:focus {
  outline: 2px solid #0075DE;
  outline-offset: 2px;
}

.c-header__cta:hover {
  background-color: #0000000D;
}

.c-header__cta:focus {
  outline: 2px solid #0075DE;
  outline-offset: 2px;
}

.c-header__link:hover {
  background-color: #0000000D;
}

.c-header__link:focus {
  outline: 2px solid #0075DE;
  outline-offset: 2px;
}

.c-header__cta-2:hover {
  background-color: #005BAB;
}

.c-header__cta-2:focus {
  background-color: #005BAB;
  outline: 2px solid #0075DE;
  outline-offset: 2px;
}
```

**Mobile anatomy**

- `header-mobile`: the component root, a `<nav>` (`.c-header-mobile`)
- `header-mobile-group`: inner grid (`.c-header-mobile__group`)
- `header-mobile-logo`: link (`.c-header-mobile__logo`)
- `header-mobile-logo-icon`: icon placeholder, 33x34px (`.c-header-mobile__logo-icon`)
- `header-mobile-group-2`: inner flex row (`.c-header-mobile__group-2`)
- `header-mobile-group-3`: inner flex row (`.c-header-mobile__group-3`)
- `header-mobile-cta`: link (`.c-header-mobile__cta`)
- `header-mobile-text`: label text, 15 characters (`.c-header-mobile__text`)
- `header-mobile-group-4`: inner flex row (`.c-header-mobile__group-4`)
- `header-mobile-menu-toggle`: button (`.c-header-mobile__menu-toggle`)
- `header-mobile-menu-toggle-icon`: icon placeholder, 22px (`.c-header-mobile__menu-toggle-icon`)

**Mobile recipe**

```html
<div class="c-header-mobile-scope">
  <nav class="c-header-mobile">
    <div class="c-header-mobile__group">
      <a class="c-header-mobile__logo" href="#">
        <span class="c-header-mobile__logo-icon" aria-hidden="true"></span>
      </a>
      <div class="c-header-mobile__group-2">
        <span class="c-header-mobile__group-3">
          <a class="c-header-mobile__cta" href="#">
            <span class="c-header-mobile__text">lorem ipsum dol</span>
          </a>
        </span>
        <div class="c-header-mobile__group-4">
          <button class="c-header-mobile__menu-toggle" type="button">
            <span class="c-header-mobile__menu-toggle-icon" aria-hidden="true"></span>
          </button>
        </div>
      </div>
    </div>
  </nav>
</div>
```

```css
.c-header-mobile-scope {
  background-color: #FFFFFF;
  color: #000000E5;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
}

.c-header-mobile {
  display: grid;
  align-items: center;
  border-spacing: 0px;
  box-sizing: border-box;
  min-height: 64px;
  position: relative;
  top: 0px;
  right: 0px;
  left: 0px;
  z-index: 100;
  background-color: #FFFFFF;
  color: #000000E5;
  box-shadow: transparent 0px 1px 0px 0px;
  cursor: default;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
  transition: box-shadow 0.2s cubic-bezier(0.42, 0, 1, 1);
}

.c-header-mobile__group {
  display: grid;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  grid-template-columns: 1fr auto 1fr;
  box-sizing: border-box;
  width: 100%;
  padding: 14px 16px;
  overflow-x: auto;
  overflow-y: auto;
  margin-right: auto;
  margin-left: auto;
}

.c-header-mobile__logo {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  max-height: 36px;
  color: #000000F2;
  outline: 2px solid transparent;
  outline-offset: 2px;
  cursor: pointer;
  text-decoration-line: none;
}

.c-header-mobile__logo-icon {
  display: block;
  flex-shrink: 0;
  box-sizing: border-box;
  width: 33px;
  height: 34px;
  overflow-x: hidden;
  overflow-y: hidden;
  background-color: currentcolor;
  transform: matrix(1, 0, 0, 1, -2, 0);
}

.c-header-mobile__group-2 {
  display: flex;
  align-items: center;
  gap: 16px;
  box-sizing: border-box;
}

.c-header-mobile__group-3 {
  display: flex;
  box-sizing: border-box;
}

.c-header-mobile__cta {
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  min-height: 36px;
  padding: 4px 14px;
  background-color: #0075DE;
  color: #FFFFFF;
  border: 1px solid transparent;
  border-radius: 8px;
  outline: 2px solid transparent;
  outline-offset: 2px;
  cursor: pointer;
  font-weight: 500;
  text-decoration-line: none;
  text-align: center;
}

.c-header-mobile__text {
  display: block;
  box-sizing: border-box;
  font-size: 14px;
  line-height: 20px;
  white-space: nowrap;
}

.c-header-mobile__group-4 {
  display: flex;
  box-sizing: border-box;
}

.c-header-mobile__menu-toggle {
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  padding: 11px;
  margin: -11px;
  background-color: transparent;
  color: #000000E5;
  border: 0;
  outline: 2px solid transparent;
  outline-offset: 2px;
  cursor: pointer;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
  letter-spacing: normal;
  text-transform: none;
  text-align: center;
  appearance: button;
}

.c-header-mobile__menu-toggle-icon {
  display: block;
  flex-shrink: 0;
  box-sizing: border-box;
  width: 22px;
  height: 22px;
  overflow-x: hidden;
  overflow-y: hidden;
  background-color: currentcolor;
}

.c-header-mobile__logo:focus {
  outline: 2px solid #0075DE;
  outline-offset: 2px;
}

.c-header-mobile__cta:hover {
  background-color: #005BAB;
}

.c-header-mobile__cta:focus {
  background-color: #005BAB;
  outline: 2px solid #0075DE;
  outline-offset: 2px;
}

.c-header-mobile__menu-toggle:focus {
  outline: 2px solid #0075DE;
  outline-offset: 2px;
}
```

**States**

- `header-logo` focus: outline 2px solid #0075DE, outline-offset 2px
- `header-cta` hover (`header-cta-hover`): background-color #0000000D
- `header-cta` focus: outline 2px solid #0075DE, outline-offset 2px
- `header-link` hover (`header-link-hover`): background-color #0000000D
- `header-link` focus: outline 2px solid #0075DE, outline-offset 2px
- `header-cta-2` hover (`header-cta-2-hover`): background-color #005BAB
- `header-cta-2` focus (`header-cta-2-focus`): background-color #005BAB, outline 2px solid #0075DE, outline-offset 2px
- mobile, `header-mobile-logo` focus: outline 2px solid #0075DE, outline-offset 2px
- mobile, `header-mobile-cta` hover (`header-mobile-cta-hover`): background-color #005BAB
- mobile, `header-mobile-cta` focus (`header-mobile-cta-focus`): background-color #005BAB, outline 2px solid #0075DE, outline-offset 2px
- mobile, `header-mobile-menu-toggle` focus: outline 2px solid #0075DE, outline-offset 2px

### Footer

**Verification**: desktop flagged, the `footer` height did not reproduce the measured 396px after 2 correction attempts; mobile flagged, the `footer-mobile` height did not reproduce the measured 709px after 2 correction attempts.

**Anatomy**

- `footer`: the component root, a `<footer>` (`.c-footer`)
- `footer-columns`: inner grid (`.c-footer__columns`)
- `footer-column`: inner grid (`.c-footer__column`)
- `footer-group`: inner flex column (`.c-footer__group`)
- `footer-link`: link (`.c-footer__link`)
- `footer-link-icon`: icon placeholder, 137x39px (`.c-footer__link-icon`)
- `footer-group-2`: inner flex column (`.c-footer__group-2`)
- `footer-inner`: inner group (`.c-footer__inner`)
- `footer-text`: label text, 19 characters (`.c-footer__text`, 3 instances)
- `footer-break`: line break (`.c-footer__break`)
- `footer-group-3`: inner group (`.c-footer__group-3`)
- `footer-text-2`: label text, 16 characters (`.c-footer__text-2`)
- `footer-nav`: inner grid (`.c-footer__nav`)
- `footer-list`: inner flex column (`.c-footer__list`, 4 instances)
- `footer-nav-item`: label text, 7 characters (`.c-footer__nav-item`, 4 instances)
- `footer-nav-item-2`: inner group (`.c-footer__nav-item-2`, 22 instances)
- `footer-nav-link`: link (`.c-footer__nav-link`, 23 instances)
- `footer-text-3`: label text, 8 characters (`.c-footer__text-3`, 22 instances)
- `footer-nav-item-3`: inner group (`.c-footer__nav-item-3`)
- `footer-group-4`: inner group (`.c-footer__group-4`)
- `footer-text-4`: label text, 1 characters (`.c-footer__text-4`)
- `footer-group-5`: inner block (`.c-footer__group-5`)
- `footer-button`: button (`.c-footer__button`)
- `footer-group-6`: inner flex row (`.c-footer__group-6`)
- `footer-group-7`: inner flex row (`.c-footer__group-7`)
- `footer-icon`: icon placeholder, 20px (`.c-footer__icon`)
- `footer-text-5`: label text, 12 characters (`.c-footer__text-5`)
- `footer-button-icon`: icon placeholder, 14px (`.c-footer__button-icon`)
- `footer-group-8`: inner flex row (`.c-footer__group-8`)
- `footer-button-2`: button (`.c-footer__button-2`)
- `footer-text-6`: label text, 15 characters (`.c-footer__text-6`)
- `footer-text-7`: label text, 24 characters (`.c-footer__text-7`)

**Desktop recipe**

```html
<div class="c-footer-scope">
  <footer class="c-footer">
    <div class="c-footer__columns">
      <div class="c-footer__column">
        <div class="c-footer__group">
          <a class="c-footer__link" href="#">
            <span class="c-footer__link-icon" aria-hidden="true"></span>
          </a>
          <figure class="c-footer__group-2">
            <div class="c-footer__inner">
              <span class="c-footer__text">lorem ipsum dolor s</span>
              <br class="c-footer__break">
              <span class="c-footer__text">lorem ipsum dolor sit amet consect</span>
            </div>
            <figcaption class="c-footer__group-3">
              <span class="c-footer__text-2">lorem ipsum dolo</span>
            </figcaption>
          </figure>
        </div>
        <nav class="c-footer__nav">
          <ul class="c-footer__list">
            <li class="c-footer__nav-item">lorem i</li>
            <li class="c-footer__nav-item-2">
              <a class="c-footer__nav-link" href="#">
                <span class="c-footer__text-3">lorem ip</span>
              </a>
            </li>
            <li class="c-footer__nav-item-2">
              <a class="c-footer__nav-link" href="#">
                <span class="c-footer__text-3">lorem ipsu</span>
              </a>
            </li>
            <li class="c-footer__nav-item-2">
              <a class="c-footer__nav-link" href="#">
                <span class="c-footer__text-3">lorem ips</span>
              </a>
            </li>
            <li class="c-footer__nav-item-2">
              <a class="c-footer__nav-link" href="#">
                <span class="c-footer__text-3">lorem i</span>
              </a>
            </li>
            <li class="c-footer__nav-item-2">
              <a class="c-footer__nav-link" href="#">
                <span class="c-footer__text-3">lorem ipsum do</span>
              </a>
            </li>
            <li class="c-footer__nav-item-2">
              <a class="c-footer__nav-link" href="#">
                <span class="c-footer__text-3">lorem ip</span>
              </a>
            </li>
            <li class="c-footer__nav-item-3">
              <a class="c-footer__nav-link" href="#">
                <span class="c-footer__group-4">
                  <span class="c-footer__text">lorem ipsum</span>
                  <span class="c-footer__text-4">l</span>
                </span>
              </a>
            </li>
          </ul>
          <ul class="c-footer__list">
            <li class="c-footer__nav-item">lorem ips</li>
            <li class="c-footer__nav-item-2">
              <a class="c-footer__nav-link" href="#">
                <span class="c-footer__text-3">lorem ipsum dolo</span>
              </a>
            </li>
            <li class="c-footer__nav-item-2">
              <a class="c-footer__nav-link" href="#">
                <span class="c-footer__text-3">lorem ipsum</span>
              </a>
            </li>
            <li class="c-footer__nav-item-2">
              <a class="c-footer__nav-link" href="#">
                <span class="c-footer__text-3">lorem ipsum</span>
              </a>
            </li>
            <li class="c-footer__nav-item-2">
              <a class="c-footer__nav-link" href="#">
                <span class="c-footer__text-3">lorem ipsum</span>
              </a>
            </li>
            <li class="c-footer__nav-item-2">
              <a class="c-footer__nav-link" href="#">
                <span class="c-footer__text-3">lorem i</span>
              </a>
            </li>
            <li class="c-footer__nav-item-2">
              <a class="c-footer__nav-link" href="#">
                <span class="c-footer__text-3">lorem ips</span>
              </a>
            </li>
          </ul>
          <ul class="c-footer__list">
            <li class="c-footer__nav-item">lorem i</li>
            <li class="c-footer__nav-item-2">
              <a class="c-footer__nav-link" href="#">
                <span class="c-footer__text-3">lorem ip</span>
              </a>
            </li>
            <li class="c-footer__nav-item-2">
              <a class="c-footer__nav-link" href="#">
                <span class="c-footer__text-3">lorem i</span>
              </a>
            </li>
            <li class="c-footer__nav-item-2">
              <a class="c-footer__nav-link" href="#">
                <span class="c-footer__text-3">lorem ip</span>
              </a>
            </li>
            <li class="c-footer__nav-item-2">
              <a class="c-footer__nav-link" href="#">
                <span class="c-footer__text-3">lorem</span>
              </a>
            </li>
            <li class="c-footer__nav-item-2">
              <a class="c-footer__nav-link" href="#">
                <span class="c-footer__text-3">lorem ipsum dol</span>
              </a>
            </li>
            <li class="c-footer__nav-item-2">
              <a class="c-footer__nav-link" href="#">
                <span class="c-footer__text-3">lorem ipsum dolor s</span>
              </a>
            </li>
          </ul>
          <ul class="c-footer__list">
            <li class="c-footer__nav-item">lorem ipsu</li>
            <li class="c-footer__nav-item-2">
              <a class="c-footer__nav-link" href="#">
                <span class="c-footer__text-3">lorem ipsu</span>
              </a>
            </li>
            <li class="c-footer__nav-item-2">
              <a class="c-footer__nav-link" href="#">
                <span class="c-footer__text-3">lorem ipsum dolo</span>
              </a>
            </li>
            <li class="c-footer__nav-item-2">
              <a class="c-footer__nav-link" href="#">
                <span class="c-footer__text-3">lorem ip</span>
              </a>
            </li>
            <li class="c-footer__nav-item-2">
              <a class="c-footer__nav-link" href="#">
                <span class="c-footer__text-3">lorem ipsu</span>
              </a>
            </li>
          </ul>
        </nav>
        <div class="c-footer__group-5">
          <button class="c-footer__button" type="button">
            <span class="c-footer__group-6">
              <span class="c-footer__group-7">
                <span class="c-footer__icon" aria-hidden="true"></span>
                <span class="c-footer__text-5">lorem ipsum</span>
              </span>
            </span>
            <span class="c-footer__button-icon" aria-hidden="true"></span>
          </button>
        </div>
        <div class="c-footer__group-8">
          <button class="c-footer__button-2" type="button">
            <span class="c-footer__text-6">lorem ipsum dol</span>
          </button>
        </div>
        <p class="c-footer__text-7">lorem ipsum dolor sit am</p>
      </div>
    </div>
  </footer>
</div>
```

```css
.c-footer-scope {
  background-color: #FFFFFF;
  color: #000000E5;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
}

.c-footer {
  display: block;
  border-spacing: 0px;
  box-sizing: border-box;
  background-color: #FFFFFF;
  color: #000000E5;
  cursor: default;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
  padding-top: 80px;
  padding-bottom: 24px;
}

.c-footer__columns {
  display: grid;
  grid-template-columns: [full-start] 64px [content-start] minmax(0px, 1fr) [content-end] 64px [full-end];
  box-sizing: border-box;
  width: 100%;
  max-width: 1380px;
  margin-right: auto;
  margin-left: auto;
}

.c-footer__column {
  display: grid;
  gap: 40px 24px;
  grid-template-columns: repeat(12, minmax(0px, 1fr));
  box-sizing: border-box;
  width: 100%;
}

.c-footer__group {
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-sizing: border-box;
}

.c-footer__link {
  display: flex;
  box-sizing: border-box;
  height: 39px;
  color: #000000F2;
  outline: 2px solid transparent;
  outline-offset: 2px;
  cursor: pointer;
  text-decoration-line: underline;
  text-decoration-color: #000000F2;
}

.c-footer__link-icon {
  display: flex;
  flex-shrink: 0;
  box-sizing: border-box;
  width: 137px;
  height: 39px;
  overflow-x: hidden;
  overflow-y: hidden;
  background-color: currentcolor;
}

.c-footer__group-2 {
  display: flex;
  flex-direction: column;
  align-items: start;
  row-gap: 16px;
  box-sizing: border-box;
  margin: auto 0px 0px;
  padding-right: 12px;
}

.c-footer__inner {
  display: block;
  box-sizing: border-box;
  width: 100%;
  max-width: 268.8px;
  margin: 0px;
  color: #000000F2;
  font-family: "Lyon Text", Georgia, YuMincho, "Yu Mincho", "Hiragino Mincho ProN", "Hiragino Mincho Pro", "Songti TC", "Songti SC", SimSun, "Nanum Myeongjo", NanumMyeongjo, Batang, serif;
}

.c-footer__inner::before {
  content: "";
  display: inline;
  box-sizing: border-box;
}

.c-footer__inner::after {
  content: "";
  display: inline;
  box-sizing: border-box;
}

.c-footer__group-3 {
  display: block;
  box-sizing: border-box;
}

.c-footer__text-2 {
  display: inline;
  box-sizing: border-box;
  color: #0000008A;
  font-size: 14px;
  line-height: 20px;
}

.c-footer__nav {
  display: grid;
  gap: 80px 24px;
  grid-template-columns: repeat(4, minmax(0px, 1fr));
  box-sizing: border-box;
}

.c-footer__list {
  display: flex;
  flex-direction: column;
  justify-content: start;
  box-sizing: border-box;
  width: 100%;
  padding: 0px;
  margin: 0px;
  list-style-type: disc;
}

.c-footer__nav-item {
  display: list-item;
  box-sizing: border-box;
  color: #0000008A;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  letter-spacing: 0.125px;
  list-style-type: none;
  padding-right: 8px;
  padding-bottom: 8px;
  padding-left: 8px;
  margin-right: -8px;
  margin-left: -8px;
}

.c-footer__nav-item-2 {
  display: list-item;
  box-sizing: border-box;
  width: fit-content;
  list-style-type: none;
  margin-right: -8px;
  margin-left: -8px;
}

.c-footer__nav-link {
  display: grid;
  align-items: center;
  column-gap: 8px;
  grid-template-columns: 1fr;
  grid-template-rows: auto;
  box-sizing: border-box;
  width: 100%;
  padding: 3px 16px 3px 8px;
  color: #000000F2;
  border-radius: 8px;
  outline: 2px solid transparent;
  outline-offset: 2px;
  cursor: pointer;
  text-decoration-line: none;
}

.c-footer__text-3 {
  display: block;
  align-self: center;
  box-sizing: border-box;
  color: #000000E5;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  text-decoration-line: underline;
  text-decoration-color: transparent;
  transition: text-decoration-color 0.2s cubic-bezier(0.42, 0, 1, 1);
}

.c-footer__nav-item-3 {
  display: list-item;
  box-sizing: border-box;
  width: fit-content;
  list-style-type: none;
  margin-top: 8px;
  margin-right: -8px;
  margin-left: -8px;
}

.c-footer__group-4 {
  display: block;
  align-self: center;
  box-sizing: border-box;
  color: #00000096;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  text-decoration-line: underline;
  text-decoration-color: transparent;
  transition: text-decoration-color 0.2s cubic-bezier(0.42, 0, 1, 1);
}

.c-footer__text-4 {
  display: inline-block;
  box-sizing: border-box;
  margin-left: 4.52166px;
}

.c-footer__group-5 {
  display: block;
  align-self: start;
  box-sizing: border-box;
}

.c-footer__button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  width: fit-content;
  max-width: 100%;
  padding: 8px 16px;
  background-color: #FFFFFF;
  color: #000000F2;
  border: 1px solid #0000001A;
  border-radius: 9999.01px;
  outline: 2px solid transparent;
  outline-offset: 2px;
  cursor: pointer;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  letter-spacing: normal;
  text-transform: none;
  text-align: start;
  appearance: button;
  transition-duration: 0.2s;
  transition-timing-function: cubic-bezier(0.42, 0, 1, 1);
  transition-property: background-color, border-color;
}

.c-footer__group-6 {
  display: flex;
  align-items: center;
  flex-grow: 1;
  box-sizing: border-box;
  overflow-x: hidden;
  overflow-y: hidden;
}

.c-footer__group-7 {
  display: flex;
  justify-content: start;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  width: 100%;
}

.c-footer__icon {
  display: block;
  flex-shrink: 0;
  box-sizing: border-box;
  width: 20px;
  height: 20px;
  overflow-x: hidden;
  overflow-y: hidden;
  vertical-align: middle;
  background-color: currentcolor;
}

.c-footer__text-5 {
  display: block;
  flex-grow: 1;
  box-sizing: border-box;
  overflow-x: hidden;
  overflow-y: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.c-footer__button-icon {
  display: block;
  flex-shrink: 0;
  box-sizing: border-box;
  width: 14px;
  height: 14px;
  overflow-x: hidden;
  overflow-y: hidden;
  vertical-align: middle;
  background-color: currentcolor;
  transition: transform 0.3s cubic-bezier(0.86, 0, 0.07, 1);
  margin-left: 8px;
}

.c-footer__group-8 {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  align-self: start;
  column-gap: 16px;
  box-sizing: border-box;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  padding-top: 9px;
}

.c-footer__button-2 {
  display: block;
  flex-shrink: 0;
  box-sizing: border-box;
  padding: 0px;
  background-color: transparent;
  color: #0000008A;
  border: 0;
  outline: 2px solid transparent;
  outline-offset: 2px;
  cursor: pointer;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  letter-spacing: normal;
  text-transform: none;
  text-align: start;
}

.c-footer__text-6 {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
}

.c-footer__text-7 {
  display: block;
  align-self: start;
  box-sizing: border-box;
  margin: 0px;
  color: #0000008A;
  font-size: 14px;
  line-height: 20px;
  padding-top: 9px;
}

.c-footer__link:focus {
  outline: 2px solid #0075DE;
  outline-offset: 2px;
}

.c-footer__nav-link:focus {
  outline: 2px solid #0075DE;
  outline-offset: 2px;
}

.c-footer__button:focus {
  background-color: #F6F5F4;
  outline: 2px solid #0075DE;
  outline-offset: 2px;
}

.c-footer__button-2:focus {
  outline: 2px solid #0075DE;
  outline-offset: 2px;
}
```

**Mobile anatomy**

- `footer-mobile`: the component root, a `<footer>` (`.c-footer-mobile`)
- `footer-mobile-columns`: inner grid (`.c-footer-mobile__columns`)
- `footer-mobile-column`: inner grid (`.c-footer-mobile__column`)
- `footer-mobile-group`: inner flex column (`.c-footer-mobile__group`)
- `footer-mobile-link`: link (`.c-footer-mobile__link`)
- `footer-mobile-link-icon`: icon placeholder, 137x39px (`.c-footer-mobile__link-icon`)
- `footer-mobile-nav`: inner grid (`.c-footer-mobile__nav`)
- `footer-mobile-list`: inner flex column (`.c-footer-mobile__list`, 4 instances)
- `footer-mobile-nav-item`: label text, 7 characters (`.c-footer-mobile__nav-item`, 4 instances)
- `footer-mobile-nav-item-2`: inner group (`.c-footer-mobile__nav-item-2`, 22 instances)
- `footer-mobile-nav-link`: link (`.c-footer-mobile__nav-link`, 23 instances)
- `footer-mobile-text`: label text, 8 characters (`.c-footer-mobile__text`, 22 instances)
- `footer-mobile-nav-item-3`: inner group (`.c-footer-mobile__nav-item-3`)
- `footer-mobile-group-2`: inner group (`.c-footer-mobile__group-2`)
- `footer-mobile-text-2`: label text, 12 characters (`.c-footer-mobile__text-2`)
- `footer-mobile-text-3`: label text, 1 characters (`.c-footer-mobile__text-3`)
- `footer-mobile-group-3`: inner block (`.c-footer-mobile__group-3`)
- `footer-mobile-button`: button (`.c-footer-mobile__button`)
- `footer-mobile-group-4`: inner flex row (`.c-footer-mobile__group-4`)
- `footer-mobile-group-5`: inner flex row (`.c-footer-mobile__group-5`)
- `footer-mobile-icon`: icon placeholder, 20px (`.c-footer-mobile__icon`)
- `footer-mobile-text-4`: label text, 12 characters (`.c-footer-mobile__text-4`)
- `footer-mobile-button-icon`: icon placeholder, 14px (`.c-footer-mobile__button-icon`)
- `footer-mobile-group-6`: inner flex row (`.c-footer-mobile__group-6`)
- `footer-mobile-button-2`: button (`.c-footer-mobile__button-2`)
- `footer-mobile-text-5`: label text, 15 characters (`.c-footer-mobile__text-5`)
- `footer-mobile-text-6`: label text, 24 characters (`.c-footer-mobile__text-6`)

**Mobile recipe**

```html
<div class="c-footer-mobile-scope">
  <footer class="c-footer-mobile">
    <div class="c-footer-mobile__columns">
      <div class="c-footer-mobile__column">
        <div class="c-footer-mobile__group">
          <a class="c-footer-mobile__link" href="#">
            <span class="c-footer-mobile__link-icon" aria-hidden="true"></span>
          </a>
        </div>
        <nav class="c-footer-mobile__nav">
          <ul class="c-footer-mobile__list">
            <li class="c-footer-mobile__nav-item">lorem i</li>
            <li class="c-footer-mobile__nav-item-2">
              <a class="c-footer-mobile__nav-link" href="#">
                <span class="c-footer-mobile__text">lorem ip</span>
              </a>
            </li>
            <li class="c-footer-mobile__nav-item-2">
              <a class="c-footer-mobile__nav-link" href="#">
                <span class="c-footer-mobile__text">lorem ipsu</span>
              </a>
            </li>
            <li class="c-footer-mobile__nav-item-2">
              <a class="c-footer-mobile__nav-link" href="#">
                <span class="c-footer-mobile__text">lorem ips</span>
              </a>
            </li>
            <li class="c-footer-mobile__nav-item-2">
              <a class="c-footer-mobile__nav-link" href="#">
                <span class="c-footer-mobile__text">lorem i</span>
              </a>
            </li>
            <li class="c-footer-mobile__nav-item-2">
              <a class="c-footer-mobile__nav-link" href="#">
                <span class="c-footer-mobile__text">lorem ipsum do</span>
              </a>
            </li>
            <li class="c-footer-mobile__nav-item-2">
              <a class="c-footer-mobile__nav-link" href="#">
                <span class="c-footer-mobile__text">lorem ip</span>
              </a>
            </li>
          </ul>
          <ul class="c-footer-mobile__list">
            <li class="c-footer-mobile__nav-item">lorem ips</li>
            <li class="c-footer-mobile__nav-item-2">
              <a class="c-footer-mobile__nav-link" href="#">
                <span class="c-footer-mobile__text">lorem ipsum dolo</span>
              </a>
            </li>
            <li class="c-footer-mobile__nav-item-2">
              <a class="c-footer-mobile__nav-link" href="#">
                <span class="c-footer-mobile__text">lorem ipsum</span>
              </a>
            </li>
            <li class="c-footer-mobile__nav-item-2">
              <a class="c-footer-mobile__nav-link" href="#">
                <span class="c-footer-mobile__text">lorem ipsum</span>
              </a>
            </li>
            <li class="c-footer-mobile__nav-item-2">
              <a class="c-footer-mobile__nav-link" href="#">
                <span class="c-footer-mobile__text">lorem ipsum</span>
              </a>
            </li>
            <li class="c-footer-mobile__nav-item-2">
              <a class="c-footer-mobile__nav-link" href="#">
                <span class="c-footer-mobile__text">lorem i</span>
              </a>
            </li>
            <li class="c-footer-mobile__nav-item-2">
              <a class="c-footer-mobile__nav-link" href="#">
                <span class="c-footer-mobile__text">lorem ips</span>
              </a>
            </li>
          </ul>
          <ul class="c-footer-mobile__list">
            <li class="c-footer-mobile__nav-item">lorem i</li>
            <li class="c-footer-mobile__nav-item-2">
              <a class="c-footer-mobile__nav-link" href="#">
                <span class="c-footer-mobile__text">lorem ip</span>
              </a>
            </li>
            <li class="c-footer-mobile__nav-item-2">
              <a class="c-footer-mobile__nav-link" href="#">
                <span class="c-footer-mobile__text">lorem i</span>
              </a>
            </li>
            <li class="c-footer-mobile__nav-item-2">
              <a class="c-footer-mobile__nav-link" href="#">
                <span class="c-footer-mobile__text">lorem ip</span>
              </a>
            </li>
            <li class="c-footer-mobile__nav-item-2">
              <a class="c-footer-mobile__nav-link" href="#">
                <span class="c-footer-mobile__text">lorem</span>
              </a>
            </li>
            <li class="c-footer-mobile__nav-item-2">
              <a class="c-footer-mobile__nav-link" href="#">
                <span class="c-footer-mobile__text">lorem ipsum dol</span>
              </a>
            </li>
            <li class="c-footer-mobile__nav-item-2">
              <a class="c-footer-mobile__nav-link" href="#">
                <span class="c-footer-mobile__text">lorem ipsum dolor s</span>
              </a>
            </li>
          </ul>
          <ul class="c-footer-mobile__list">
            <li class="c-footer-mobile__nav-item">lorem ipsu</li>
            <li class="c-footer-mobile__nav-item-2">
              <a class="c-footer-mobile__nav-link" href="#">
                <span class="c-footer-mobile__text">lorem ipsu</span>
              </a>
            </li>
            <li class="c-footer-mobile__nav-item-2">
              <a class="c-footer-mobile__nav-link" href="#">
                <span class="c-footer-mobile__text">lorem ipsum dolo</span>
              </a>
            </li>
            <li class="c-footer-mobile__nav-item-2">
              <a class="c-footer-mobile__nav-link" href="#">
                <span class="c-footer-mobile__text">lorem ip</span>
              </a>
            </li>
            <li class="c-footer-mobile__nav-item-2">
              <a class="c-footer-mobile__nav-link" href="#">
                <span class="c-footer-mobile__text">lorem ipsu</span>
              </a>
            </li>
            <li class="c-footer-mobile__nav-item-3">
              <a class="c-footer-mobile__nav-link" href="#">
                <span class="c-footer-mobile__group-2">
                  <span class="c-footer-mobile__text-2">lorem ipsum</span>
                  <span class="c-footer-mobile__text-3">l</span>
                </span>
              </a>
            </li>
          </ul>
        </nav>
        <div class="c-footer-mobile__group-3">
          <button class="c-footer-mobile__button" type="button">
            <span class="c-footer-mobile__group-4">
              <span class="c-footer-mobile__group-5">
                <span class="c-footer-mobile__icon" aria-hidden="true"></span>
                <span class="c-footer-mobile__text-4">lorem ipsum</span>
              </span>
            </span>
            <span class="c-footer-mobile__button-icon" aria-hidden="true"></span>
          </button>
        </div>
        <div class="c-footer-mobile__group-6">
          <button class="c-footer-mobile__button-2" type="button">
            <span class="c-footer-mobile__text-5">lorem ipsum dol</span>
          </button>
        </div>
        <p class="c-footer-mobile__text-6">lorem ipsum dolor sit am</p>
      </div>
    </div>
  </footer>
</div>
```

```css
.c-footer-mobile-scope {
  background-color: #FFFFFF;
  color: #000000E5;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
}

.c-footer-mobile {
  display: block;
  border-spacing: 0px;
  box-sizing: border-box;
  background-color: #FFFFFF;
  color: #000000E5;
  cursor: default;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
  padding-top: 40px;
  padding-bottom: 12px;
}

.c-footer-mobile__columns {
  display: grid;
  grid-template-columns: [full-start] 16px [content-start] minmax(0px, 1fr) [content-end] 16px [full-end];
  box-sizing: border-box;
  width: 100%;
  max-width: 1284px;
  margin-right: auto;
  margin-left: auto;
}

.c-footer-mobile__column {
  display: grid;
  gap: 40px 12px;
  grid-template-columns: repeat(4, minmax(0px, 1fr));
  box-sizing: border-box;
  width: 100%;
}

.c-footer-mobile__group {
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-sizing: border-box;
}

.c-footer-mobile__link {
  display: flex;
  box-sizing: border-box;
  height: 39px;
  color: #000000F2;
  outline: 2px solid transparent;
  outline-offset: 2px;
  cursor: pointer;
  text-decoration-line: underline;
  text-decoration-color: #000000F2;
}

.c-footer-mobile__link-icon {
  display: flex;
  flex-shrink: 0;
  box-sizing: border-box;
  width: 137px;
  height: 39px;
  overflow-x: hidden;
  overflow-y: hidden;
  background-color: currentcolor;
}

.c-footer-mobile__nav {
  display: grid;
  gap: 40px 12px;
  grid-template-columns: repeat(2, minmax(0px, 1fr));
  box-sizing: border-box;
}

.c-footer-mobile__list {
  display: flex;
  flex-direction: column;
  justify-content: start;
  box-sizing: border-box;
  width: 100%;
  padding: 0px;
  margin: 0px;
  list-style-type: disc;
}

.c-footer-mobile__nav-item {
  display: list-item;
  box-sizing: border-box;
  color: #0000008A;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  letter-spacing: 0.125px;
  list-style-type: none;
  padding-right: 8px;
  padding-bottom: 8px;
  padding-left: 8px;
  margin-right: -8px;
  margin-left: -8px;
}

.c-footer-mobile__nav-item-2 {
  display: list-item;
  box-sizing: border-box;
  width: fit-content;
  list-style-type: none;
  margin-right: -8px;
  margin-left: -8px;
}

.c-footer-mobile__nav-link {
  display: grid;
  align-items: center;
  column-gap: 8px;
  grid-template-columns: 1fr;
  grid-template-rows: auto;
  box-sizing: border-box;
  width: 100%;
  padding: 3px 16px 3px 8px;
  color: #000000F2;
  border-radius: 8px;
  outline: 2px solid transparent;
  outline-offset: 2px;
  cursor: pointer;
  text-decoration-line: none;
}

.c-footer-mobile__text {
  display: block;
  align-self: center;
  box-sizing: border-box;
  color: #000000E5;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  text-decoration-line: underline;
  text-decoration-color: transparent;
  transition: text-decoration-color 0.2s cubic-bezier(0.42, 0, 1, 1);
}

.c-footer-mobile__nav-item-3 {
  display: list-item;
  box-sizing: border-box;
  width: fit-content;
  list-style-type: none;
  margin-top: auto;
  margin-right: -8px;
  margin-left: -8px;
}

.c-footer-mobile__group-2 {
  display: block;
  align-self: center;
  box-sizing: border-box;
  color: #00000096;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  text-decoration-line: underline;
  text-decoration-color: transparent;
  transition: text-decoration-color 0.2s cubic-bezier(0.42, 0, 1, 1);
}

.c-footer-mobile__text-3 {
  display: inline-block;
  box-sizing: border-box;
  margin-left: 4.52166px;
}

.c-footer-mobile__group-3 {
  display: block;
  box-sizing: border-box;
}

.c-footer-mobile__button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  width: fit-content;
  max-width: 100%;
  padding: 8px 16px;
  background-color: #FFFFFF;
  color: #000000F2;
  border: 1px solid #0000001A;
  border-radius: 9999.01px;
  outline: 2px solid transparent;
  outline-offset: 2px;
  cursor: pointer;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  letter-spacing: normal;
  text-transform: none;
  text-align: start;
  appearance: button;
  transition-duration: 0.2s;
  transition-timing-function: cubic-bezier(0.42, 0, 1, 1);
  transition-property: background-color, border-color;
}

.c-footer-mobile__group-4 {
  display: flex;
  align-items: center;
  flex-grow: 1;
  box-sizing: border-box;
  overflow-x: hidden;
  overflow-y: hidden;
}

.c-footer-mobile__group-5 {
  display: flex;
  justify-content: start;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  width: 100%;
}

.c-footer-mobile__icon {
  display: block;
  flex-shrink: 0;
  box-sizing: border-box;
  width: 20px;
  height: 20px;
  overflow-x: hidden;
  overflow-y: hidden;
  vertical-align: middle;
  background-color: currentcolor;
}

.c-footer-mobile__text-4 {
  display: block;
  flex-grow: 1;
  box-sizing: border-box;
  overflow-x: hidden;
  overflow-y: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.c-footer-mobile__button-icon {
  display: block;
  flex-shrink: 0;
  box-sizing: border-box;
  width: 14px;
  height: 14px;
  overflow-x: hidden;
  overflow-y: hidden;
  vertical-align: middle;
  background-color: currentcolor;
  transition: transform 0.3s cubic-bezier(0.86, 0, 0.07, 1);
  margin-left: 8px;
}

.c-footer-mobile__group-6 {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 16px;
  box-sizing: border-box;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}

.c-footer-mobile__button-2 {
  display: block;
  flex-shrink: 0;
  box-sizing: border-box;
  padding: 0px;
  background-color: transparent;
  color: #0000008A;
  border: 0;
  outline: 2px solid transparent;
  outline-offset: 2px;
  cursor: pointer;
  font-family: NotionInter, Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  letter-spacing: normal;
  text-transform: none;
  text-align: start;
}

.c-footer-mobile__text-5 {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
}

.c-footer-mobile__text-6 {
  display: block;
  box-sizing: border-box;
  margin: -24px 0px 0px;
  color: #0000008A;
  font-size: 14px;
  line-height: 20px;
}

.c-footer-mobile__link:focus {
  outline: 2px solid #0075DE;
  outline-offset: 2px;
}

.c-footer-mobile__nav-link:focus {
  outline: 2px solid #0075DE;
  outline-offset: 2px;
}

.c-footer-mobile__button:focus {
  background-color: #F6F5F4;
  outline: 2px solid #0075DE;
  outline-offset: 2px;
}

.c-footer-mobile__button-2:focus {
  outline: 2px solid #0075DE;
  outline-offset: 2px;
}
```

**States**

- `footer-link` focus: outline 2px solid #0075DE, outline-offset 2px
- `footer-nav-link` focus: outline 2px solid #0075DE, outline-offset 2px
- `footer-button` focus (`footer-button-focus`): background-color #F6F5F4, outline 2px solid #0075DE, outline-offset 2px
- `footer-button-2` focus: outline 2px solid #0075DE, outline-offset 2px
- mobile, `footer-mobile-link` focus: outline 2px solid #0075DE, outline-offset 2px
- mobile, `footer-mobile-nav-link` focus: outline 2px solid #0075DE, outline-offset 2px
- mobile, `footer-mobile-button` focus (`footer-mobile-button-focus`): background-color #F6F5F4, outline 2px solid #0075DE, outline-offset 2px
- mobile, `footer-mobile-button-2` focus: outline 2px solid #0075DE, outline-offset 2px

## Do's and Don'ts

### Do
- Fill primary CTAs with `primary` (#0075DE) and `on-primary` text, as `button-primary`, `button-primary-2`, `header-cta-2` and `header-mobile-cta` all do; darken to `primary-pressed` (#005BAB) on hover and focus.
- Pair the primary CTA with the tinted secondary: `primary-tint` (#E6F3FE) fill and `primary-pressed` text, as in `button-secondary` and `hero-cta-2`.
- Keep button radii by variant: 8px (`rounded.sm`) for `button-primary`, `button-primary-2`, `button-secondary`, `button-secondary-2`; 4px (`rounded.xs`) for `button-ghost` and `button-ghost-2`.
- Respect the observed control heights: 36px `button-primary`, 38px `button-primary-2` / `button-secondary` / `button-secondary-2`, 30px `button-ghost` / `button-ghost-2`.
- Separate page bands with `section-padding-y` (96px), and pack link cards tightly: `card-2` instances sit in a 5-column grid with 8px gaps (`card-2-grid-gap`).
- Use the observed shadow tiers for lift: the header's `#0000001A 0px 1px 0px 0px` under-rule and the four-layer soft shadow for floating previews; keep the `blur(12px)` frosted fill on `media-control`.
- Set display headlines with their token tracking (`hero-display` -4.6px, `display-lg` -2px, `display-md` -1.87501px).
- Show focus with `outline: 2px solid` `primary-focus` at a 2px offset on every interactive element.

### Don't
- Don't introduce radius values beyond `rounded.xs`, `rounded.sm`, `rounded.md` and `rounded.full`, and don't make primary CTAs pills.
- Don't add a third typeface; Notion Inter and Lyon Text are the whole system, and Lyon Text stays in `quote`-style testimonial and editorial lines.
- Don't use the illustration accents (`accent-amber`, `accent-coral`, `accent-red`, `accent-indigo`, `success`) for buttons, links or text; blue owns interaction.
- Don't replace the multi-layer, low-opacity shadows with a single dark drop shadow, and don't describe the system as flat.
- Don't use `primary-tint` or `chip-lavender` as section backgrounds; alternating bands use `surface-warm` (#F6F5F4).
- Don't apply negative tracking to text at 18px or below; `body`, `body-sm` and `quote` are `normal`, and `caption` is +0.125px.
- Don't swap the borders on `card-2` or `footer-button` (`1px solid #0000001A`) for the opaque `hairline` hex; that hex is a hover fill (`button-secondary-2-hover`).

## Responsive Behavior

### Scope
This analysis is two-viewport (one desktop, one mobile capture). No breakpoint values were observed, so none are given here.

### What Changes on Mobile
- **Header:** `header-mobile` keeps the 64px bar and white fill, drops the ghost navigation buttons and links, and keeps only the logo, the blue CTA (`header-mobile-cta`, 8px radius, `primary` fill) and a hamburger toggle. `header-mobile` is (flagged: the `header-mobile-logo` width did not reproduce the measured 33px after 2 correction attempts).
- **Content:** every multi-column grid collapses to a single column of full-width stacked cards; hero CTAs stack full width.
- **Testimonials:** the testimonial grid becomes a horizontally scrolling carousel.
- **Footer:** `footer-mobile` stacks the brand block above the link lists, which reflow into two columns; it grows to a measured 709px (flagged: the `footer-mobile` height did not reproduce the measured 709px after 2 correction attempts).

### Touch Targets
The mobile menu toggle (`header-mobile-menu-toggle`) is a 44px square with 11px padding around a 22px icon, the one control explicitly sized for touch. Desktop ghost buttons are 30px tall (`button-ghost`) and primary buttons 36–38px; they are hidden or replaced on mobile rather than enlarged, so any new mobile control should meet the 44px toggle's size.

### Typography
The capture did not yield separate mobile type tokens; scale display sizes down proportionally while keeping the tracking-to-size ratio.

## Iteration Guide

1. Reference tokens, never raw hex: `primary`, `primary-pressed`, `primary-tint`, `ink`, `surface`, `surface-warm`. Translucent ink tints (#000000E5, #0000008A) belong to component recipes; reuse them only where the matching recipe uses them.
2. Blue is the only interactive hue. New actions are either `button-primary` style (`primary` fill) or `button-secondary` style (`primary-tint` fill, `primary-pressed` text); quiet navigation uses the transparent `button-ghost` pattern with a #0000000D hover wash.
3. Variants live in the component recipes (`button-primary-2`, `button-secondary-2`, `button-ghost-2`, `card-2`, `card-3`); extend an existing key rather than inventing a parallel style, and keep its height and padding tokens.
4. Pick type by token, not by weight: weights are tied to specific steps (600 hero, 500 72px line, 700 54px h2). Keep the negative display tracking and never apply it below 20px.
5. Radius is semantic: `rounded.xs` ghost controls, `rounded.sm` buttons and links, `rounded.md` cards, `rounded.full` chips. No other values.
6. Elevation stays whisper-light: hairline `1px solid #0000001A`, the header under-rule, the four- and six-layer soft shadows, and `blur(12px)` over media. Never darken shadows beyond the measured opacities.
7. Every interactive element reserves a transparent 2px outline and shows `2px solid` `primary-focus` at a 2px offset on focus; do not remove it.

## Known Gaps

- Only one page (the homepage) was captured; product, pricing, and logged-in app surfaces were not sampled.
- `card-3` testimonial cards (flagged: the render matched 4% of the original pixels, below the 96% required (instance 1) after 2 correction attempts); their portrait imagery and duotone treatment are not reproducible from the recipe.
- `hero` (flagged: the `hero-text` height did not reproduce the measured 216px after 2 correction attempts).
- `header` (flagged: the `header-logo` width did not reproduce the measured 33px after 2 correction attempts), plus the same flag on `header-mobile`.
- `footer` (flagged: the `footer` height did not reproduce the measured 396px after 2 correction attempts) and `footer-mobile` (flagged: 709px height not reproduced).
- Hover was captured for buttons and header links only; card hover, active/pressed states and disabled states were not measured.
- No container max width or base spacing step was derived; card internal padding exists only on component recipes.
- Breakpoints are unknown: the capture used exactly two viewports.
- Animations, transitions, carousel motion, the stats ticker and dropdown menus behind the header ghost buttons were not captured.
- The cookie banner seen in screenshots has no recipe; its border and shadow values are unmeasured.
- No values were dropped by grounding.