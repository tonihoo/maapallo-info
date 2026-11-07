<%@ page contentType="text/html; charset=UTF-8" isELIgnored="false" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="spring" uri="http://www.springframework.org/tags" %>

<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="format-detection" content="telephone=no" />
    <link rel="icon" href="favicon.ico" type="image/x-icon">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&amp;display=swap">
    <title>Maapallo.info</title>

    <link rel="stylesheet" type="text/css" href="${clientDomain}/Oskari${path}/icons.css"/>
    <link rel="stylesheet" type="text/css" href="${clientDomain}/Oskari${path}/oskari.min.css"/>
    <style type="text/css">
        :root {
            --mp-orange: rgba(255, 179, 76, 0.75);
            --mp-orange-solid: rgba(255, 179, 76, 0.9);
            --mp-green: rgba(126, 199, 129, 0.75);
            --mp-green-solid: rgba(126, 199, 129, 0.9);
            --mp-header: 12px;
            --mp-footer: 18px;
            --mp-rail: 64px;
            --mp-menu: 220px;
        }
        html, body {
            margin: 0;
            padding: 0;
            height: 100%;
            overflow: hidden;
            font-family: Roboto, Helvetica, Arial, sans-serif;
        }
        body.mp-3d {
            --mp-orange: var(--mp-green);
            --mp-orange-solid: var(--mp-green-solid);
        }
        #oskari {
            height: 100%;
            width: 100%;
            display: block !important;
        }
        #maptools {
            display: flex !important;
            flex-direction: column;
            position: fixed !important;
            top: var(--mp-header) !important;
            bottom: var(--mp-footer) !important;
            height: auto !important;
            max-height: calc(100vh - var(--mp-header) - var(--mp-footer)) !important;
            left: var(--mp-rail) !important;
            width: var(--mp-menu) !important;
            z-index: 1250;
            box-sizing: border-box;
            padding-top: 0;
            margin: 0 !important;
            background: #3c3c3c;
            color: #fff;
            overflow-x: hidden;
            overflow-y: auto;
            transform: translateX(calc(-100% - 80px)) !important;
            transition: transform 0.2s ease;
        }
        #maptools.open { transform: none !important; }
        #logobar {
            flex: 0 0 auto;
            height: 88px !important;
            margin: 8px 16px 0;
            background-image: url('${clientDomain}/Oskari${path}/../assets/maapallo_logo.png') !important;
            background-repeat: no-repeat !important;
            background-position: center !important;
            background-size: contain !important;
            background-origin: content-box !important;
        }
        #menubar, #toolbar, #login, #language-selector-root, #demolink { flex: 0 0 auto; }
        #login { margin: 12px 10px; }
        #language-selector-root { margin: 0 10px 16px; }
        #login a { color: #fff; }
        .oskari-flyout {
            top: calc(var(--mp-header) + 40px) !important;
            left: var(--mp-rail) !important;
            max-height: calc(100vh - var(--mp-header) - var(--mp-footer) - 40px) !important;
            background-color: #fff !important;
            border: 0 !important;
            border-radius: 16px !important;
            overflow: hidden;
            box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
            z-index: 1300 !important;
        }
        .oskari-tile.layerlist { display: none !important; }
        body.mp-menu-open .oskari-flyout {
            left: calc(var(--mp-rail) + var(--mp-menu) + 12px) !important;
        }
        .oskari-flyout.layerlist,
        body.mp-menu-open .oskari-flyout.layerlist {
            top: calc(var(--mp-header) + 48px) !important;
            left: var(--mp-rail) !important;
            right: auto !important;
            width: min(420px, calc(100vw - var(--mp-rail) - 24px)) !important;
            max-height: calc(100vh - var(--mp-header) - 80px) !important;
        }
        .t_flyout {
            left: var(--mp-rail) !important;
            right: auto !important;
            top: calc(var(--mp-header) + 40px) !important;
            bottom: auto !important;
            width: min(480px, calc(100vw - var(--mp-rail) - 24px)) !important;
            height: auto !important;
            max-height: calc(100vh - var(--mp-header) - var(--mp-footer) - 52px) !important;
            transform: none !important;
            border-radius: 16px !important;
            overflow: auto !important;
            box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
        }
        body.mp-menu-open .t_flyout {
            left: calc(var(--mp-rail) + var(--mp-menu) + 12px) !important;
            width: min(480px, calc(100vw - var(--mp-rail) - var(--mp-menu) - 36px)) !important;
        }
        .oskari-flyoutheading,
        [class*="Flyout__HeaderBand"] {
            display: none !important;
            height: 0 !important;
            border: 0 !important;
            background: transparent !important;
        }
        .oskari-tile-status.icon-bubble-left,
        .oskari-tile-status.icon-bubble-right {
            background: #ffb34c !important;
            color: #1a1a1a !important;
            border-radius: 2px;
        }
        body.mp-3d .oskari-tile-status.icon-bubble-left,
        body.mp-3d .oskari-tile-status.icon-bubble-right {
            background: #7ec781 !important;
        }
        .tool.dimension-tool,
        .tool.dimension-tool-back {
            color: #ffb34c !important;
        }
        body.mp-3d .tool.dimension-tool,
        body.mp-3d .tool.dimension-tool-back {
            color: #7ec781 !important;
        }
        #toolbar .marker-share,
        #toolbar .icon-find-nearest-address,
        #toolbar .upload-material,
        #toolbar .myplaces-draw-point {
            filter: hue-rotate(-15deg) saturate(0.7) brightness(1.18);
        }
        body.mp-3d #toolbar .marker-share,
        body.mp-3d #toolbar .icon-find-nearest-address,
        body.mp-3d #toolbar .upload-material,
        body.mp-3d #toolbar .myplaces-draw-point {
            filter: hue-rotate(68deg) saturate(0.55) brightness(1.05);
        }
        .oskari-flyouttoolbar {
            background-color: #3c3c3c !important;
            border: 0 !important;
            height: 52px !important;
            color: #fff !important;
        }
        .oskari-flyout-title { margin: 16px 16px 0 18px !important; }
        .oskari-flyout-title p {
            color: #fff !important;
            font-family: Roboto, Helvetica, Arial, sans-serif;
            font-size: 16px;
            font-weight: 500;
            letter-spacing: 0.01em;
            line-height: 20px;
        }
        .oskari-flyouttools {
            margin-top: 18px !important;
            margin-right: 14px !important;
            filter: invert(1);
        }
        .oskari-flyoutcontent {
            background: #f6f5f3;
            color: #1a1a1a;
            padding: 8px 14px 16px !important;
        }
        .oskari-flyout .ant-tabs-nav {
            margin-bottom: 12px !important;
        }
        .oskari-flyout .ant-tabs-tab {
            padding: 10px 2px !important;
            color: #6d6d6d !important;
            font-weight: 500;
        }
        .oskari-flyout .ant-tabs-tab-active .ant-tabs-tab-btn {
            color: #1a1a1a !important;
            font-weight: 600;
        }
        .oskari-flyout .ant-tabs-ink-bar {
            background: #ffb34c !important;
            height: 3px !important;
            border-radius: 3px;
        }
        .oskari-flyout [class*="StyledBadge"],
        .oskari-badge-oskari {
            background: #ffb34c !important;
            color: #1a1a1a !important;
            border-radius: 999px !important;
            min-width: 22px;
            height: 20px !important;
            line-height: 20px !important;
            padding: 0 7px !important;
            font-weight: 700;
            box-shadow: none !important;
        }
        .oskari-flyout .ant-input-affix-wrapper,
        .oskari-flyout .ant-select-selector,
        .oskari-flyout .ant-select.ant-select-outlined {
            border-radius: 10px !important;
            border-color: #e4e0da !important;
            background: #fff !important;
            box-shadow: none !important;
        }
        .oskari-flyout .ant-input-affix-wrapper {
            padding: 7px 12px !important;
        }
        .oskari-flyout .ant-select-selector {
            min-height: 38px !important;
            align-items: center !important;
        }
        .oskari-flyout .ant-input-affix-wrapper:hover,
        .oskari-flyout .ant-input-affix-wrapper-focused,
        .oskari-flyout .ant-select:hover .ant-select-selector,
        .oskari-flyout .ant-select-focused .ant-select-selector,
        .oskari-flyout .ant-select.ant-select-outlined:hover,
        .oskari-flyout .ant-select-open.ant-select-outlined,
        .oskari-flyout .ant-select-focused.ant-select-outlined {
            border-color: #ffb34c !important;
            box-shadow: 0 0 0 3px rgba(255, 179, 76, 0.22) !important;
        }
        .ant-select-dropdown {
            border-radius: 12px !important;
            padding: 6px !important;
            box-shadow: 0 14px 36px rgba(0, 0, 0, 0.16) !important;
        }
        .ant-select-item {
            border-radius: 8px !important;
            margin: 2px 0;
            min-height: 36px !important;
        }
        .ant-select-item-option-active:not(.ant-select-item-option-disabled) {
            background: rgba(255, 179, 76, 0.18) !important;
        }
        .ant-select-item-option-selected:not(.ant-select-item-option-disabled) {
            background: rgba(255, 179, 76, 0.32) !important;
            color: #1a1a1a !important;
            font-weight: 600;
        }
        .oskari-flyout .ant-collapse {
            background: transparent !important;
            border: 0 !important;
        }
        .oskari-flyout .ant-collapse-item {
            margin-bottom: 10px !important;
            overflow: hidden;
            background: #fff !important;
            border: 1px solid #ece8e2 !important;
            border-radius: 12px !important;
        }
        .oskari-flyout .ant-collapse-header {
            align-items: center !important;
            font-weight: 600 !important;
        }
        .oskari-flyout .ant-collapse-content {
            border-top: 1px solid #f1eee9 !important;
            background: #fff !important;
        }
        .oskari-flyout [class*="Layer__LayerDiv"]:hover {
            background: rgba(255, 179, 76, 0.14);
        }
        .oskari-flyout .ant-switch-checked {
            background: #ffb34c !important;
        }
        body.mp-3d .oskari-flyout .ant-tabs-ink-bar,
        body.mp-3d .oskari-flyout .ant-switch-checked,
        body.mp-3d .oskari-flyout [class*="StyledBadge"],
        body.mp-3d .oskari-badge-oskari {
            background: #7ec781 !important;
        }
        .divmanazerpopup {
            background: #fff !important;
            border: 0 !important;
            border-radius: 16px !important;
            overflow: hidden;
            box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
        }
        .divmanazerpopup h3.popupHeader {
            background-color: #424343 !important;
            color: #fff !important;
            margin: 0;
            padding: 12px 36px 12px 15px !important;
            font-family: Roboto, Helvetica, Arial, sans-serif;
            font-size: 16px;
            font-weight: 400;
        }
        .divmanazerpopup div.close-icon { filter: invert(1); top: 14px !important; }
        #contentMap {
            margin-left: 0 !important;
            width: 100% !important;
            height: 100% !important;
        }
        #mapdiv,
        #mapdiv .ol-viewport {
            width: 100% !important;
            height: 100% !important;
        }

        #mp-about-btn {
            appearance: none !important;
            -webkit-appearance: none !important;
            background-color: var(--mp-orange) !important;
            background-image: none !important;
            color: black !important;
            text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35) !important;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
            position: fixed;
            top: var(--mp-header);
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
            width: max-content !important;
            min-width: 0 !important;
            max-width: calc(100vw - 180px);
            height: auto !important;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 8px 16px !important;
            border-radius: 999px;
            border: 0 !important;
            font: inherit;
            cursor: pointer;
        }
        #mp-about-btn:hover { filter: brightness(1.06); }
        #mp-about-btn:focus-visible {
            outline: 2px solid #1a1a1a;
            outline-offset: 2px;
        }
        #mp-about-btn h1 {
            margin: 0;
            padding: 0 !important;
            font-family: Roboto, Helvetica, Arial, sans-serif;
            font-size: 0.75rem;
            font-weight: 400;
            line-height: 1;
            letter-spacing: 0.08333em;
            text-transform: uppercase;
            text-align: center;
        }
        .mp-rail {
            position: fixed;
            top: var(--mp-header);
            left: 12px;
            z-index: 1400;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
        }
        #mp-menu-btn .mp-icon-close { display: none; }
        #mp-menu-btn[aria-expanded="true"] .mp-icon-menu { display: none; }
        #mp-menu-btn[aria-expanded="true"] .mp-icon-close { display: block; }

        .mp-footer {
            background-color: var(--mp-orange);
            color: rgba(0, 0, 0, 0.6);
            text-align: center;
            box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1);
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            height: var(--mp-footer);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            pointer-events: none;
        }

        .mp-mode {
            appearance: none;
            position: fixed;
            top: var(--mp-header);
            right: 12px;
            z-index: 1001;
            box-sizing: border-box;
            width: 40px;
            height: 40px;
            min-width: 40px;
            min-height: 40px;
            max-width: 40px;
            max-height: 40px;
            padding: 0;
            border: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.9);
            color: #4caf50;
            font-size: 13px;
            font-weight: 700;
            font-family: Roboto, Helvetica, Arial, sans-serif;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            cursor: pointer;
            line-height: 1;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        body.mp-3d .mapplugins.right.top {
            top: 40px !important;
            bottom: auto !important;
            height: auto !important;
        }
        body.mp-3d .mp-mode { color: #ffb34c; }
        .mp-mode:hover { background: #fff; }

        .mp-basemap { position: relative; }
        #mp-menu-btn[aria-expanded="true"],
        #mp-layers-btn[aria-expanded="true"],
        #mp-basemap.open #mp-basemap-btn {
            background: #ffb34c !important;
            background-color: #ffb34c !important;
            color: #1a1a1a !important;
            border-color: #ffb34c !important;
        }
        body.mp-3d #mp-menu-btn[aria-expanded="true"],
        body.mp-3d #mp-layers-btn[aria-expanded="true"],
        body.mp-3d #mp-basemap.open #mp-basemap-btn {
            background: #7ec781 !important;
            background-color: #7ec781 !important;
            border-color: #7ec781 !important;
        }
        .mp-icon-btn {
            appearance: none;
            width: 40px;
            height: 40px;
            min-width: 0;
            padding: 0;
            background: rgba(42, 42, 42, 0.8);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
        }
        .mp-basemap-menu {
            display: none;
            position: fixed;
            top: calc(var(--mp-header) + 96px);
            left: var(--mp-rail);
            z-index: 1300;
            width: min(420px, calc(100vw - var(--mp-rail) - 24px));
            background: #f6f5f3;
            border: 0;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
            padding: 0;
        }
        .mp-basemap.open .mp-basemap-menu { display: block; }
        .mp-basemap-title {
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-sizing: border-box;
            height: 52px;
            margin: 0;
            padding: 0 8px 0 18px;
            background: #3c3c3c;
            color: #fff;
            font-family: Roboto, Helvetica, Arial, sans-serif;
            font-size: 16px;
            font-weight: 500;
            letter-spacing: 0.01em;
            line-height: 20px;
        }
        .mp-basemap-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 8px 14px 16px;
        }
        .mp-basemap-swatch {
            width: 28px;
            height: 28px;
            flex: 0 0 28px;
            border-radius: 8px;
            border: 1px solid rgba(0, 0, 0, 0.08);
        }
        .mp-basemap-swatch.satellite { background: linear-gradient(135deg, #1a5276, #1e8449 55%, #b9770e); }
        .mp-basemap-swatch.topo { background: linear-gradient(160deg, #d5d8dc, #7dcea0 42%, #1e8449); }
        .mp-basemap-swatch.cartoLight { background: #f7f7f5; }
        .mp-basemap-swatch.cartoDark { background: #2c2c2c; }
        .mp-basemap-swatch.osm { background: linear-gradient(160deg, #aed6f1, #f9e79f 55%, #abebc6); }

        .mp-controls {
            position: fixed;
            bottom: 45px;
            right: 20px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .mp-controls button {
            appearance: none;
            width: 40px;
            height: 40px;
            min-width: 0;
            padding: 0;
            background: rgba(42, 42, 42, 0.8);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            cursor: pointer;
            font-size: 20px;
            font-weight: 700;
            font-family: Roboto, Helvetica, Arial, sans-serif;
            line-height: 40px;
        }
        .mp-controls button.mp-small { font-size: 16px; font-weight: 400; }

        .mp-coords {
            position: fixed;
            bottom: 45px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(128, 128, 128, 0.9);
            color: white;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-family: monospace;
            border: 1px solid rgba(255, 255, 255, 0.3);
            z-index: 1000;
            pointer-events: none;
            visibility: hidden;
            white-space: nowrap;
        }

        .mapplugin.search {
            position: fixed !important;
            right: 120px !important;
            bottom: 45px !important;
            left: auto !important;
            top: auto !important;
            width: 300px !important;
            z-index: 2000 !important;
            margin: 0 !important;
        }
        .mapplugin.search .ant-btn,
        .mapplugin.search .anticon-search { display: none !important; }
        .mapplugin.search [class*="SearchContainer"],
        .mapplugin.search .ant-select {
            background: transparent !important;
            box-shadow: none !important;
            padding: 0 !important;
            height: auto !important;
        }
        .mapplugin.search .ant-input-affix-wrapper {
            background: #fff !important;
            color: #000 !important;
            border-radius: 8px !important;
            border: 1px solid rgba(0, 0, 0, 0.15) !important;
            box-shadow: none !important;
            height: 42px !important;
            font-family: Roboto, Helvetica, Arial, sans-serif !important;
            font-size: 14px !important;
        }
        .mapplugin.search .ant-input-affix-wrapper input {
            background: transparent !important;
            color: #000 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            height: auto !important;
            min-height: 0 !important;
            padding: 0 !important;
            font-family: inherit !important;
            font-size: 14px !important;
        }
        .mapplugin.fullscreen,
        .mapplugin.coordinatetool,
        .mapplugin.maprotator,
        .mapplugin.featuredataplugin,
        .zoombar,
        .plugins-bottom,
        .ol-attribution { display: none !important; }

        .t_GuidedTour:not(.mp-welcome-ready) { visibility: hidden !important; }
        .t_GuidedTour {
            position: fixed !important;
            top: calc(var(--mp-header) + 48px) !important;
            left: var(--mp-rail) !important;
            right: auto !important;
            bottom: auto !important;
            transform: none !important;
            width: min(420px, calc(100vw - var(--mp-rail) - 24px)) !important;
            max-width: calc(100vw - var(--mp-rail) - 24px) !important;
            max-height: calc(100vh - var(--mp-header) - 80px) !important;
            margin: 0 !important;
            border: 0 !important;
            border-radius: 16px !important;
            overflow: hidden !important;
            background: #f6f5f3 !important;
            box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22) !important;
            z-index: 1300 !important;
            font-family: Roboto, Helvetica, Arial, sans-serif;
        }
        .t_GuidedTour [class*="Header__Container"] {
            display: flex !important;
            align-items: center !important;
            box-sizing: border-box;
            height: 52px !important;
            margin: 0 !important;
            padding: 0 8px 0 18px !important;
            background: #3c3c3c !important;
            border: 0 !important;
            border-radius: 0 !important;
        }
        .t_GuidedTour [class*="Header__TitleContainer"] { flex: 1 1 auto; min-width: 0; }
        .t_GuidedTour [class*="Header__Container"] h3 {
            margin: 0 !important;
            color: #fff !important;
            font-family: Roboto, Helvetica, Arial, sans-serif !important;
            font-size: 16px !important;
            font-weight: 500 !important;
            letter-spacing: 0.01em;
            line-height: 20px !important;
        }
        .t_GuidedTour [class*="Header__Container"] .ant-btn {
            background: transparent !important;
            border: 0 !important;
            box-shadow: none !important;
            color: #fff !important;
        }
        .t_GuidedTour [class*="Header__Container"] .anticon { color: #fff !important; }
        .t_GuidedTour .t_body {
            background: #f6f5f3 !important;
            max-height: calc(100vh - var(--mp-header) - 132px);
            overflow: auto;
        }
        .t_GuidedTour .mp-welcome p {
            margin: 0 0 14px;
            font-size: 15px;
            line-height: 1.5;
            color: #1a1a1a;
        }
        .t_GuidedTour .mp-welcome a { color: #1565c0; }
        .t_GuidedTour .ant-btn-primary {
            background: #ffb34c !important;
            border-color: #ffb34c !important;
            color: #1a1a1a !important;
            box-shadow: none !important;
            border-radius: 8px !important;
            font-weight: 500;
        }
        body.mp-3d .t_GuidedTour .ant-btn-primary {
            background: #7ec781 !important;
            border-color: #7ec781 !important;
        }
        .t_GuidedTour .ant-btn-default {
            background: #fff !important;
            border-color: #e4e0da !important;
            color: #1a1a1a !important;
            box-shadow: none !important;
            border-radius: 8px !important;
        }
        .t_GuidedTour .ant-checkbox-checked .ant-checkbox-inner {
            background: #ffb34c !important;
            border-color: #ffb34c !important;
        }
        body.mp-3d .t_GuidedTour .ant-checkbox-checked .ant-checkbox-inner {
            background: #7ec781 !important;
            border-color: #7ec781 !important;
        }

        .mp-backdrop {
            display: none;
            position: fixed;
            inset: 0;
            z-index: 1190;
            background: transparent;
        }
        .mp-backdrop.open {
            display: block;
            left: calc(var(--mp-rail) + var(--mp-menu));
        }
        #login input[type="text"],
        #login input[type="password"],
        #login input[type="submit"] {
            width: 100%;
            box-sizing: border-box;
            margin-bottom: 8px;
            padding: 8px;
            border: 1px solid #b7b7b7;
            border-radius: 4px;
            color: #333;
            font: 14px/1.2 Roboto, Arial, sans-serif;
            background: #fff;
        }
        #language-selector-root select { width: 100%; margin-top: 8px; }

        .mp-menu-btn,
        .mp-icon-btn,
        .mp-controls button,
        .mp-mode,
        .mp-basemap-menu button {
            appearance: none !important;
            -webkit-appearance: none !important;
        }
        .mp-icon-btn,
        .mp-controls button,
        .mp-basemap-menu button,
        .mp-menu-btn,
        .mp-mode {
            background-image: none !important;
        }
        .mp-icon-btn,
        .mp-controls button {
            background-color: rgba(42, 42, 42, 0.8) !important;
            color: #fff !important;
            width: 40px !important;
            height: 40px !important;
            min-width: 0 !important;
            padding: 0 !important;
        }
        .mp-basemap-list button {
            width: 100% !important;
            height: auto !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
            display: flex !important;
            align-items: center !important;
            gap: 12px !important;
            margin: 0 !important;
            padding: 12px 14px !important;
            background-color: #fff !important;
            background-image: none !important;
            color: #1a1a1a !important;
            text-shadow: none !important;
            border: 1px solid #ece8e2 !important;
            border-radius: 12px !important;
            box-shadow: none !important;
            font-family: Roboto, Helvetica, Arial, sans-serif !important;
            font-size: 15px !important;
            font-weight: 600 !important;
            line-height: 1.2 !important;
            text-align: left !important;
            cursor: pointer;
        }
        .mp-basemap-list button:hover {
            background-color: rgba(255, 179, 76, 0.14) !important;
        }
        .mp-basemap-list button[aria-current="true"] {
            background-color: rgba(255, 179, 76, 0.22) !important;
            border-color: #ffb34c !important;
        }
        body.mp-3d .mp-basemap-list button:hover {
            background-color: rgba(126, 199, 129, 0.16) !important;
        }
        body.mp-3d .mp-basemap-list button[aria-current="true"] {
            background-color: rgba(126, 199, 129, 0.24) !important;
            border-color: #7ec781 !important;
        }
        .mp-basemap-close {
            appearance: none !important;
            width: 32px !important;
            height: 32px !important;
            min-width: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 8px !important;
            background: transparent !important;
            background-image: none !important;
            color: #fff !important;
            text-shadow: none !important;
            box-shadow: none !important;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .mp-basemap-close:hover { background: rgba(255, 255, 255, 0.12) !important; }
        .mp-menu-btn {
            background-image: none !important;
            color: #fff !important;
        }
        .mp-mode {
            box-sizing: border-box !important;
            width: 40px !important;
            height: 40px !important;
            min-width: 40px !important;
            min-height: 40px !important;
            max-width: 40px !important;
            max-height: 40px !important;
            padding: 0 !important;
            border-radius: 50% !important;
            font-size: 13px !important;
            line-height: 1 !important;
        }

        @media (max-width: 900px) {
            .oskari-flyout { left: var(--mp-rail) !important; }
            body.mp-menu-open .oskari-flyout { left: calc(var(--mp-rail) + var(--mp-menu) + 8px) !important; }
            .oskari-flyout.layerlist,
            body.mp-menu-open .oskari-flyout.layerlist {
                top: calc(var(--mp-header) + 48px) !important;
                left: var(--mp-rail) !important;
                right: 8px !important;
                width: auto !important;
            }
            .mp-mode {
                top: var(--mp-header);
                right: 12px;
                width: 38px !important;
                height: 38px !important;
                min-width: 38px !important;
                min-height: 38px !important;
                max-width: 38px !important;
                max-height: 38px !important;
                font-size: 14px;
                line-height: 1 !important;
            }
            .mapplugin.search { right: 16px !important; left: 16px !important; width: auto !important; bottom: 36px !important; }
            body.mp-menu-open .mapplugin.search { left: calc(var(--mp-rail) + var(--mp-menu) + 12px) !important; }
            .mp-controls, .mp-coords { bottom: 96px; }
        }
        @media (max-width: 640px) {
            .t_flyout,
            body.mp-menu-open .t_flyout {
                left: var(--mp-rail) !important;
                right: 8px !important;
                width: auto !important;
            }
        }
    </style>
</head>
<body>
<button class="mp-header" id="mp-about-btn" type="button" title="Tietoa portaalista" aria-haspopup="dialog" aria-expanded="false">
    <h1>Maapallo.info</h1>
</button>
<div class="mp-backdrop" id="mp-backdrop"></div>
<div id="oskari">
    <nav id="maptools">
        <div id="logobar"></div>
        <div id="menubar"></div>
        <div id="toolbar"></div>
        <div id="demolink"></div>
        <div id="login">
        <c:choose>
            <c:when test="${!empty loginState}">
                <p class="error"><spring:message code="invalid_password_or_username" text="Invalid password or username!" /></p>
            </c:when>
        </c:choose>
        <c:choose>
            <c:when test="${!empty _logout_uri}">
                <form action="${pageContext.request.contextPath}${_logout_uri}" method="POST" id="logoutform">
                    <a href="${pageContext.request.contextPath}${_logout_uri}" onClick="jQuery('#logoutform').submit();return false;"><spring:message code="logout" text="Logout" /></a>
                </form>
                <a href="${pageContext.request.contextPath}${_registration_uri}" id="oskari-profile-link"><spring:message code="account" text="Account" /></a>
            </c:when>
            <c:otherwise>
                <c:if test="${!empty _login_uri && !empty _login_field_user}">
                    <form action='${pageContext.request.contextPath}${_login_uri}' method="post" accept-charset="UTF-8">
                        <input size="16" id="username" name="${_login_field_user}" type="text" autocomplete="username" placeholder="<spring:message code="username" text="Username" />" required>
                        <input size="16" id="password" name="${_login_field_pass}" type="password" autocomplete="current-password" placeholder="<spring:message code="password" text="Password" />" required>
                        <input type="submit" id="submit" value="<spring:message code="login" text="Log in" />">
                    </form>
                </c:if>
            </c:otherwise>
        </c:choose>
    </div>
        <div id="language-selector-root"></div>
    </nav>
</div>

<button class="mp-mode" id="mp-mode" type="button" title="Vaihda 3D-näkymään">3D</button>

<div class="mp-rail" id="mp-rail">
    <button class="mp-icon-btn mp-menu-btn" id="mp-menu-btn" type="button" title="Valikko" aria-label="Valikko" aria-expanded="false">
        <svg class="mp-icon-menu" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"/>
        </svg>
        <svg class="mp-icon-close" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4z"/>
        </svg>
    </button>
    <button class="mp-icon-btn" id="mp-layers-btn" type="button" title="Karttatasot" aria-label="Karttatasot" aria-expanded="false">
        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <polygon points="11,3 21,8 11,13 1,8" fill="currentColor"/>
            <polygon points="11,8 21,13 11,18 1,13" fill="currentColor" opacity="0.7"/>
            <polygon points="11,13 21,18 11,23 1,18" fill="currentColor" opacity="0.4"/>
        </svg>
    </button>
    <div class="mp-basemap" id="mp-basemap">
        <button class="mp-icon-btn" id="mp-basemap-btn" type="button" title="Pohjakartta" aria-label="Pohjakartta" aria-expanded="false">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M15 5.5 9 3 3 5.2v13.6L9 16.5 15 19l6-2.2V3.2L15 5.5zm0 1.7 3.2-1.2v10.7L15 18V7.2zM9 4.8l4.2 1.6V18l-4.2-1.8V4.8zM5 6.4l2.5-.9v11.2L5 17.6V6.4z"/>
            </svg>
        </button>
        <div class="mp-basemap-menu" id="mp-basemap-menu">
            <div class="mp-basemap-title">
                <span>Pohjakartta</span>
                <button class="mp-basemap-close" id="mp-basemap-close" type="button" title="Sulje" aria-label="Sulje">
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="currentColor" d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4z"/>
                    </svg>
                </button>
            </div>
            <div class="mp-basemap-list" id="mp-basemap-list"></div>
        </div>
    </div>
</div>

<div class="mp-controls">
    <button class="mp-small" id="mp-home" type="button" title="Palaa aloitusnäkymään">⌂</button>
    <button id="mp-zoom-in" type="button" title="Lähennä">+</button>
    <button id="mp-zoom-out" type="button" title="Loitonna">−</button>
</div>
<div class="mp-coords" id="mp-coords"></div>
<footer class="mp-footer"><span id="mp-attribution">Imagery courtesy NASA Worldview, part of NASA EOSDIS (GIBS)</span></footer>

<script type="text/javascript">
    var ajaxUrl = '${ajaxUrl}';
    var controlParams = ${controlParams};
</script>
<script type="text/javascript" src="${clientDomain}/Oskari${path}/oskari.min.js"></script>
<script type="text/javascript" src="${clientDomain}/Oskari${path}/oskari_lang_${language}.js"></script>
<script type="text/javascript" src="${clientDomain}/Oskari${path}/index.js"></script>
<script type="text/javascript">
(function () {
    var HOME = { x: 3339585, y: 2273030, zoom: 1 };
    var BASEMAPS = [
        { key: 'satellite', name: 'Satelliitti', icon: '🌍', maxZoom: 8, template: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg', attribution: 'Imagery courtesy NASA Worldview, part of NASA EOSDIS (GIBS)' },
        { key: 'topo', name: 'Topografinen', icon: '🏔️', maxZoom: 17, template: 'https://tile.opentopomap.org/{z}/{x}/{y}.png', attribution: 'Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap' },
        { key: 'cartoLight', name: 'Vaalea', icon: '🌕', maxZoom: 16, template: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', attribution: '© Esri, HERE, Garmin, © OpenStreetMap contributors' },
        { key: 'cartoDark', name: 'Tumma', icon: '🌑', maxZoom: 16, template: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', attribution: '© Esri, HERE, Garmin, © OpenStreetMap contributors' },
        { key: 'osm', name: 'OpenStreetMap', icon: '🗺️', maxZoom: 19, template: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© OpenStreetMap contributors' }
    ];
    var currentBase = 'satellite';
    var baseSources = null;
    var baseLayerType = null;
    var activeBaseLayer = null;
    var cesiumBase = null;

    function sandbox() { return Oskari.getSandbox(); }
    function mapModule() { return sandbox().findRegisteredModuleInstance('MainMapModule'); }
    function olMap() {
        var map = mapModule();
        return map && map.getMap && map.getMap();
    }
    function is3dView() {
        if (document.body.classList.contains('mp-3d')) return true;
        try {
            var map = sandbox().getMap();
            return !!(map && map.getSupports3D && map.getSupports3D());
        } catch (e) {
            return false;
        }
    }
    // The sample migration stores the other view's id on this view. It is
    // generated per database, so a uuid copied from a local install 404s in production.
    function otherViewUuid() {
        var dim = sandbox().findRegisteredModuleInstance('DimensionChangeBundleInstance');
        return dim && dim.conf && dim.conf.uuid || null;
    }
    function cesiumScene() {
        var map = mapModule();
        return map && map.getCesiumScene && map.getCesiumScene();
    }
    function isStreetLayer(layer) {
        if (!layer || (layer.get && layer.get('mpBasemap'))) return false;
        var src = layer.getSource && layer.getSource();
        if (!src || !src.getUrls || !src.getTileUrlFunction) return false;
        var urls = [];
        try { urls = src.getUrls() || []; } catch (e) { return false; }
        var joined = urls.join(' ');
        return joined.indexOf('.pbf') !== -1 || joined.indexOf('maptiler.com/tiles') !== -1 || joined.indexOf('gibs.earthdata.nasa.gov') !== -1;
    }
    function hideStreetBase() {
        var map = olMap();
        if (!map || document.body.classList.contains('mp-3d')) return;
        map.getLayers().getArray().forEach(function (layer) {
            if (!isStreetLayer(layer)) return;
            if (!layer._mpPinned) {
                layer._mpPinned = true;
                layer.on('change:visible', function () {
                    if (layer.getVisible()) layer.setVisible(false);
                });
            }
            if (layer.getVisible()) layer.setVisible(false);
        });
    }
    function moveMap(x, y, zoom) {
        var map = mapModule();
        sandbox().request(map, Oskari.requestBuilder('MapMoveRequest')(x, y, zoom));
    }
    function toLonLat(x, y) {
        var lon = x * 180 / 20037508.34;
        var lat = Math.atan(Math.sinh(y * Math.PI / 20037508.34)) * 180 / Math.PI;
        return [lon, lat];
    }
    function formatCoord(lon, lat) {
        var ns = lat >= 0 ? 'N' : 'S';
        var ew = lon >= 0 ? 'E' : 'W';
        return ns + ' ' + Math.abs(lat).toFixed(3) + '°, ' + ew + ' ' + Math.abs(lon).toFixed(3) + '°';
    }
    function basemapItem(key) {
        for (var i = 0; i < BASEMAPS.length; i++) if (BASEMAPS[i].key === key) return BASEMAPS[i];
        return BASEMAPS[0];
    }
    function tileConstructors() {
        var mm = mapModule();
        var map = olMap();
        var plugin = mm && mm._layerPlugins && mm._layerPlugins.wmslayer;
        if (!map || !plugin || !mm._mapLayerService) return null;
        var wms = null;
        mm._mapLayerService.getAllLayers().forEach(function (layer) {
            if (!wms && layer.getLayerType && layer.getLayerType() === 'wms' && plugin.isLayerSupported(layer)) wms = layer;
        });
        if (!wms) return null;
        plugin.addMapLayerToMap(wms, true, false);
        var created = plugin.getOLMapLayers(wms);
        var olLayer = created && (Array.isArray(created) ? created[0] : created);
        if (!olLayer || !olLayer.getSource()) {
            try { plugin.removeMapLayerFromMap(wms); } catch (e) {}
            return null;
        }
        var types = { Layer: olLayer.constructor, Source: olLayer.getSource().constructor };
        try { plugin.removeMapLayerFromMap(wms); } catch (e) { map.removeLayer(olLayer); }
        return types;
    }
    function ensureBaseSources() {
        if (baseSources) return baseSources;
        var map = olMap();
        var types = tileConstructors();
        if (!map || !types) return null;
        var projection = map.getView().getProjection();
        var probe = new types.Source({ url: 'about:blank', params: {}, projection: projection });
        var fullGrid = probe.getTileGridForProjection(projection);
        var Grid = fullGrid.constructor;
        baseLayerType = types.Layer;
        baseSources = {};
        BASEMAPS.forEach(function (item) {
            var grid = new Grid({
                extent: fullGrid.getExtent(),
                origin: fullGrid.getOrigin(0),
                resolutions: fullGrid.getResolutions().slice(0, item.maxZoom + 1),
                tileSize: fullGrid.getTileSize(0)
            });
            var template = item.template;
            var source = new types.Source({
                url: template,
                params: {},
                projection: projection,
                wrapX: true,
                tileGrid: grid,
                transition: 0
            });
            source.setTileUrlFunction(function (coord) {
                if (!coord) return undefined;
                var z = coord[0];
                var n = Math.pow(2, z);
                var x = coord[1];
                var y = coord[2];
                if (y < 0 || y >= n) return undefined;
                x = ((x % n) + n) % n;
                return template.replace('{z}', z).replace('{x}', x).replace('{y}', y);
            });
            source.setTileLoadFunction(function (tile, url) {
                var image = tile.getImage();
                image.referrerPolicy = 'strict-origin-when-cross-origin';
                image.src = url;
            });
            baseSources[item.key] = source;
        });
        map.getLayers().on('add', hideStreetBase);
        hideStreetBase();
        return baseSources;
    }
    function hideCesiumImagery() {
        var scene = cesiumScene();
        if (!scene || !scene.imageryLayers) return;
        var layers = scene.imageryLayers;
        for (var i = 0; i < layers.length; i++) {
            var layer = layers.get(i);
            if (!layer || layer === cesiumBase || layer._mpBasemap) continue;
            var provider = layer.imageryProvider;
            if (provider && provider.maximumLevel > 0) layer.show = false;
        }
    }
    function setCesiumBase(item) {
        var scene = cesiumScene();
        if (!scene || !window.Cesium || !Cesium.UrlTemplateImageryProvider || !scene.imageryLayers) return false;
        var layers = scene.imageryLayers;
        hideCesiumImagery();
        if (cesiumBase && cesiumBase._mpBasemap === item.key) return true;
        if (cesiumBase) {
            layers.remove(cesiumBase, true);
            cesiumBase = null;
        }
        var imagery = new Cesium.UrlTemplateImageryProvider({
            url: item.template,
            tilingScheme: new Cesium.WebMercatorTilingScheme(),
            maximumLevel: item.maxZoom,
            tileWidth: 256,
            tileHeight: 256
        });
        cesiumBase = layers.addImageryProvider(imagery);
        cesiumBase._mpBasemap = item.key;
        return true;
    }
    function showBasemapChoice(item) {
        currentBase = item.key;
        document.getElementById('mp-attribution').textContent = item.attribution;
        document.querySelectorAll('#mp-basemap-list button').forEach(function (btn) {
            if (btn.getAttribute('data-key') === item.key) btn.setAttribute('aria-current', 'true');
            else btn.removeAttribute('aria-current');
        });
    }
    function setBaseMap(key) {
        var item = basemapItem(key);
        currentBase = item.key;
        if (is3dView()) {
            if (!setCesiumBase(item)) return;
            showBasemapChoice(item);
            return;
        }
        var map = olMap();
        if (!map) return;
        var sources = ensureBaseSources();
        if (!sources || !sources[item.key] || !baseLayerType) return;
        if (activeBaseLayer) map.removeLayer(activeBaseLayer);
        var layer = new baseLayerType({ source: sources[item.key], visible: true });
        layer.set('mpBasemap', item.key);
        layer.setZIndex(-1);
        map.getLayers().insertAt(0, layer);
        activeBaseLayer = layer;
        hideStreetBase();
        if (map.renderSync) map.renderSync();
        showBasemapChoice(item);
    }

    function closeBasemap() {
        document.getElementById('mp-basemap').classList.remove('open');
        document.getElementById('mp-basemap-btn').setAttribute('aria-expanded', 'false');
    }
    function layerTile() { return document.querySelector('.oskari-tile.layerlist'); }
    function layersOpen() {
        var tile = layerTile();
        return !!(tile && tile.classList.contains('oskari-tile-attached'));
    }
    function syncLayersButton() {
        document.getElementById('mp-layers-btn').setAttribute('aria-expanded', layersOpen() ? 'true' : 'false');
    }
    function closeLayers() {
        if (!layersOpen() || !window.jQuery) return;
        jQuery(layerTile()).trigger('click');
        syncLayersButton();
    }
    function setMenu(open) {
        if (open) {
            closeBasemap();
            closeLayers();
        }
        document.getElementById('maptools').classList.toggle('open', open);
        document.body.classList.toggle('mp-menu-open', open);
        document.getElementById('mp-backdrop').classList.toggle('open', open);
        var toggle = document.getElementById('mp-menu-btn');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.title = open ? 'Sulje valikko' : 'Valikko';
    }
    var loginForm = document.querySelector('#login form:not(#logoutform)');
    if (loginForm) {
        loginForm.addEventListener('submit', function () {
            try { sessionStorage.setItem('mp-menu-after-login', '1'); } catch (e) {}
        });
    }
    try {
        if (sessionStorage.getItem('mp-menu-after-login') === '1') {
            sessionStorage.removeItem('mp-menu-after-login');
            setMenu(true);
        }
    } catch (e) {}
    var WELCOME_MARK = 'MP_WELCOME';
    var WELCOME_HTML = ''
        + '<p>Maapallo.info on karttaportaali, joka havainnollistaa maantieteellisiä ilmiöitä erityisesti globaalin kehityksen ja ympäristön näkökulmista. Portaalin suunnittelusta ja ylläpidosta vastaa <a href="https://kehmy.fi" target="_blank" rel="noopener noreferrer">Kehitysmaantieteen yhdistys</a>.</p>'
        + '<p>Pohjakartat ja karttakerrosten aineistot ovat peräisin avoimista lähteistä.</p>'
        + '<p>Portaalia kehitetään aktiivisesti ja siihen pyritään lisäämään useita uusia toiminnallisuuksia ja aineistoja lähitulevaisuudessa.</p>'
        + '<p>Palautetta ja parannusehdotuksia voi lähettää osoitteeseen <a href="mailto:kehmy.ry@gmail.com">kehmy.ry@gmail.com</a>.</p>'
        + '<p>Maapallo.info on rakennettu avoimen lähdekoodin työkaluilla erityisesti <a href="https://oskari.org" target="_blank" rel="noopener noreferrer">Oskari-alustaa</a> hyödyntäen. Sivuston koodi on <a href="https://github.com/tonihoo/maapallo-info" target="_blank" rel="noopener noreferrer">GitHubissa</a>. Voit osallistua Maapallo.infon kehittämiseen myös tekemällä oman pull requestin!</p>';
    ['fi', 'en', 'sv'].forEach(function (lang) {
        Oskari.registerLocalization({
            lang: lang,
            key: 'GuidedTour',
            value: { title: 'Tervetuloa', page1: { title: 'Tervetuloa', message: WELCOME_MARK } }
        }, true);
    });
    function paintWelcome() {
        var popup = document.querySelector('.t_GuidedTour');
        if (!popup) return;
        var box = popup.querySelector('.t_body > div');
        var text = box && box.firstChild && box.firstChild.nodeType === 3 ? box.firstChild.nodeValue : '';
        if (box && text.indexOf(WELCOME_MARK) === 0) {
            var holder = document.createElement('div');
            holder.className = 'mp-welcome';
            holder.innerHTML = WELCOME_HTML;
            box.replaceChild(holder, box.firstChild);
        }
        popup.classList.add('mp-welcome-ready');
    }
    new MutationObserver(paintWelcome).observe(document.body, { childList: true, subtree: true });
    function guidedTour() {
        if (!window.Oskari || !Oskari.getSandbox) return null;
        return Oskari.getSandbox().findRegisteredModuleInstance('GuidedTour');
    }
    function ensureTour() {
        var gt = guidedTour();
        if (gt && gt._handler) return gt;
        if (window.jQuery && jQuery.cookie) {
            jQuery.cookie('pti_tour_seen', '', { expires: -1, path: '/' });
        }
        var created = Oskari.clazz.create('Oskari.framework.bundle.guidedtour.GuidedTourBundleInstance');
        if (created && created.start) created.start();
        return guidedTour();
    }
    var aboutBtn = document.getElementById('mp-about-btn');
    function toggleWelcome() {
        var gt = guidedTour();
        if (!gt || !gt._handler) {
            gt = ensureTour();
            if (!gt || !gt._handler) return;
            gt._handler._showGuideContentForStep(0);
            paintWelcome();
            aboutBtn.setAttribute('aria-expanded', 'true');
            return;
        }
        var handler = gt._handler;
        if (handler.popupControls && handler.state.step === 0) {
            handler.popupCleanup(false);
            aboutBtn.setAttribute('aria-expanded', 'false');
            return;
        }
        handler._showGuideContentForStep(0);
        paintWelcome();
        aboutBtn.setAttribute('aria-expanded', 'true');
    }
    aboutBtn.addEventListener('click', toggleWelcome);
    document.getElementById('mp-menu-btn').addEventListener('click', function (event) {
        event.stopPropagation();
        setMenu(!document.body.classList.contains('mp-menu-open'));
    });
    function toggleLayers() {
        var tile = layerTile();
        if (!tile || !window.jQuery) return;
        var willOpen = !layersOpen();
        closeBasemap();
        if (willOpen) setMenu(false);
        jQuery(tile).trigger('click');
        syncLayersButton();
    }
    document.getElementById('mp-backdrop').addEventListener('click', function () {
        setMenu(false);
        closeBasemap();
    });
    document.getElementById('mp-layers-btn').addEventListener('click', function (event) {
        event.stopPropagation();
        toggleLayers();
    });
    document.getElementById('mp-basemap-btn').addEventListener('click', function (event) {
        event.stopPropagation();
        var box = document.getElementById('mp-basemap');
        var open = !box.classList.contains('open');
        if (open) {
            setMenu(false);
            closeLayers();
        }
        box.classList.toggle('open', open);
        document.getElementById('mp-basemap-btn').setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.getElementById('mp-basemap-close').addEventListener('click', function (event) {
        event.stopPropagation();
        closeBasemap();
    });
    document.getElementById('mp-home').addEventListener('click', function () {
        moveMap(HOME.x, HOME.y, HOME.zoom);
    });
    document.getElementById('mp-zoom-in').addEventListener('click', function () {
        var map = mapModule();
        var c = map.getMapCenter();
        moveMap(c.lon, c.lat, map.getMapZoom() + 1);
    });
    document.getElementById('mp-zoom-out').addEventListener('click', function () {
        var map = mapModule();
        var c = map.getMapCenter();
        moveMap(c.lon, c.lat, Math.max(0, map.getMapZoom() - 1));
    });

    var menu = document.getElementById('mp-basemap-list');
    BASEMAPS.forEach(function (item) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('data-key', item.key);
        btn.innerHTML = '<span class="mp-basemap-swatch ' + item.key + '"></span><span>' + item.name + '</span>';
        btn.addEventListener('click', function () {
            setBaseMap(item.key);
            closeBasemap();
        });
        menu.appendChild(btn);
    });

    Oskari.on('app.start', function () {
        var is3d = is3dView();
        document.body.classList.toggle('mp-3d', is3d);
        var mode = document.getElementById('mp-mode');
        mode.textContent = is3d ? '2D' : '3D';
        mode.title = is3d ? 'Vaihda 2D-näkymään' : 'Vaihda 3D-näkymään';
        mode.addEventListener('click', function () {
            var target = otherViewUuid();
            if (target) window.location = '/?uuid=' + target;
        });

        var input = document.querySelector('.mapplugin.search input');
        if (input) input.placeholder = 'Hae sijaintia...';
        setBaseMap('satellite');
        [400, 1200, 2500].forEach(function (delay) {
            setTimeout(function () { setBaseMap(currentBase); }, delay);
        });
        var layersTile = layerTile();
        if (layersTile && window.MutationObserver) {
            new MutationObserver(syncLayersButton).observe(layersTile, { attributes: true, attributeFilter: ['class'] });
        }
        syncLayersButton();

        var olMap = mapModule().getMap();
        function refreshMapSize() {
            olMap.updateSize();
        }
        refreshMapSize();
        window.addEventListener('resize', refreshMapSize);
        olMap.on('pointermove', function (evt) {
            if (!evt.coordinate) return;
            var ll = toLonLat(evt.coordinate[0], evt.coordinate[1]);
            var box = document.getElementById('mp-coords');
            box.textContent = formatCoord(ll[0], ll[1]);
            box.style.visibility = 'visible';
        });
    });
})();
</script>
</body>
</html>
