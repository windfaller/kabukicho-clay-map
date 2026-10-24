# 歌舞伎町黏土地圖 · Kabukicho Clay Map

新宿歌舞伎町一帶的 3D 黏土風互動地圖，單一 HTML 檔（`index.html`，約 96 KB，gzip 約 52 KB）。

## 功能
- 地標：東急歌舞伎町塔（錐形塔身＋頂部鰭片）、新宿東寶大樓（哥吉拉頭）、歌舞伎町一番街紅色拱門、新宿黃金街（密集小型兩層屋）、花園神社（鳥居）、Cinecity 廣場、西武新宿站／新宿王子大飯店。
- 導航：搜尋與清單（點選飛行）、起訖點路線（Dijkstra，動畫路線、距離與步行時間）、指北針、小地圖、鍵盤（WASD/方向鍵移動、Q/E 旋轉、+/- 縮放、R 重設、B 鳥瞰、N 朝北）。
- 多語：繁中／English／日本語，可用 `?lang=zh|en|ja` 指定；名稱取自 OSM `name`、`name:en`、`name:ja`。
- 晝夜循環，`?t=分鐘`（例如 `?t=1260` 為 21:00）。

## 地名翻譯
- 每個地名皆有繁中／English／日本語。優先使用 OSM `name:zh-Hant`、`name:en`、`name:ja`（日本的 `name` 即日文名）。
- OSM 缺漏者由 `scripts/i18n_names.py` 補上：通用詞意譯（通り→通、Street→-dori），專有名詞以平文式羅馬拼音。資料中每筆名稱帶旗標（`o`=OSM、`t`=本站翻譯），資訊卡會標示來源。

## 視覺
- 向《人中之龍》式夜景致敬的風格化表現（無遊戲標誌或遊戲內名稱）：歌舞伎町一番街與中央路入口拱門、立面堆疊直立招牌、屋頂看板、LED 螢幕、濕路面霓虹倒影、放大的哥吉拉頭、點燈的東急塔頂、黃金街燈籠、花園神社朱紅鳥居、黃色折扣店外牆、打擊練習場網籠。比例有誇張。
- 「地標導覽」按鈕可依序飛覽各地標。

## 資料方法
1. Overpass API 下載建物、道路、鐵路、綠地、POI（`scripts/fetch_extra.sh` 補抓花園神社與黃金街範圍）。
2. `scripts/process2.py`：投影為公尺座標、只保留需要的標籤，座標以 0.1 m 量化＋差分＋zigzag varint，deflate 後 base64 內嵌；瀏覽器以 DecompressionStream 解碼。
3. `scripts/build2.py`：以 esbuild 壓縮 `app2.js`，連同資料注入 `template2.html`。
4. `scripts/test2.py`：Playwright 測試（含靜態影格差異檢查）。

## 資料來源與授權
- 地圖資料 © OpenStreetMap contributors，依 [ODbL](https://opendatacommons.org/licenses/odbl/) 授權。
- 建物高度：有 `height` 標籤者照用，其餘依樓層數或類型推估，並非實測值。地標造型為示意。
