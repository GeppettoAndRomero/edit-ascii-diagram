/**
 * Preact island (interactive UI) copy, per locale.
 *
 * The island receives `locale` as a prop (present at SSR time) and never
 * reads it from `document`, so SSR and client render the same strings
 * (avoids hydration mismatches). Interpolation uses `{name}` / `{count}`
 * placeholders, replaced with `.replace('{name}', x)` at the call site.
 */
export const ui = {
  en: {
    // Input (idle state — hidden once a diagram is loaded). D8: paste only.
    inputHeading: 'Paste a diagram',
    inputSubtitle: 'Paste text made of Unicode box-drawing characters, or load the sample.',
    pasteLabel: 'Diagram text',
    pastePlaceholder: 'Paste a box-drawing diagram here, for example:\n┌───────┐\n│ hello │\n└───────┘',
    loadFromText: 'Load',
    loadSample: 'Load sample',

    // Toolbar
    addBoxAction: 'Add box',
    undo: 'Undo',
    redo: 'Redo',
    reset: 'Reset',
    startOver: 'Paste a different diagram',
    resetConfirmTitle: 'Reset to the pasted version?',
    resetConfirmBody: 'This discards every change made since this diagram was loaded. This cannot be undone.',
    resetConfirmConfirm: 'Reset',
    resetConfirmCancel: 'Cancel',
    startOverConfirmTitle: 'Paste a different diagram?',
    startOverConfirmBody: 'This discards the current diagram and every change made to it. This cannot be undone.',
    startOverConfirmConfirm: 'Paste different',
    startOverConfirmCancel: 'Cancel',

    // Editor overlay
    editorAria: 'Diagram editor',
    closeEditor: 'Close the editor',
    moreOptions: 'Diagram tools and details',

    // Canvas
    canvasHeading: 'Canvas',
    canvasAria: 'Box diagram canvas',
    canvasScrollAria: 'Canvas scroll area',
    canvasHint:
      'Click a box to select it, drag to move, or drag its bottom-right corner to resize. Everything here can also be done from the list on the right with a keyboard.',

    // Inspector — unselected (list)
    inspectorHeading: 'Edit',
    boxesHeading: 'Boxes',
    emptyBoxes: 'No boxes detected yet. Paste a diagram that contains one, or add one.',
    editBox: 'Edit box "{label}"',
    untitledBox: 'Untitled box',
    backToList: 'Back to list',

    // Inspector — box selected
    geometryHeading: 'Position & size',
    xField: 'X',
    yField: 'Y',
    widthField: 'Width',
    heightField: 'Height',
    textField: 'Text',
    deleteBoxAction: 'Delete box',

    // Code pane
    codeHeading: 'Diagram text',
    codeLabel: 'Diagram text',
    codeHint: 'This is always the source of truth — edits here update the canvas about 300ms after you stop typing.',

    // Output
    outputHeading: 'Export',
    copyText: 'Copy text',
    copyForAI: 'Copy for AI (before/after)',
    downloadTxt: 'Download .txt',
    copied: 'Copied to clipboard.',
    aiCopyIntro: 'Change the UI structure from "before" to "after" below. The difference is the change instruction.',

    // Stats
    statsHeading: 'Summary',
    statsBoxes: '{count} boxes detected',
    statsHealed: '{count} border gaps auto-filled',
    statsSize: '{cols} × {rows} grid',

    // InstallPrompt
    installHeading: 'Install app',
    installBody: 'Add to your home screen for quick access.',
    install: 'Install',
    later: 'Later',

    // ThemeToggle
    themeToLight: 'Switch to light mode',
    themeToDark: 'Switch to dark mode',
    themeLabel: 'Theme',

    // shared
    close: 'Close',
    required: 'Required',
  },
  ja: {
    inputHeading: '罫線図を貼り付け',
    inputSubtitle: 'Unicode罫線文字で描かれたテキストを貼り付けるか、サンプルを読み込みます。',
    pasteLabel: '図のテキスト',
    pastePlaceholder: 'ここに罫線図を貼り付けます。例:\n┌───────┐\n│ hello │\n└───────┘',
    loadFromText: '読み込む',
    loadSample: 'サンプルを読み込む',

    addBoxAction: 'ボックスを追加',
    undo: '元に戻す',
    redo: 'やり直す',
    reset: 'リセット',
    startOver: '別の図を貼り付ける',
    resetConfirmTitle: '貼り付け時点の内容に戻しますか？',
    resetConfirmBody: 'この図を読み込んでから行ったすべての変更が失われます。この操作は取り消せません。',
    resetConfirmConfirm: 'リセット',
    resetConfirmCancel: 'キャンセル',
    startOverConfirmTitle: '別の図を貼り付けますか？',
    startOverConfirmBody: '現在の図とすべての変更が失われます。この操作は取り消せません。',
    startOverConfirmConfirm: '別のものを貼り付ける',
    startOverConfirmCancel: 'キャンセル',

    editorAria: '図のエディタ',
    closeEditor: 'エディタを閉じる',
    moreOptions: '図のツールと詳細',

    canvasHeading: 'キャンバス',
    canvasAria: 'ボックス図のキャンバス',
    canvasScrollAria: 'キャンバスのスクロール領域',
    canvasHint:
      'ボックスをクリックして選択し、ドラッグで移動、右下角をドラッグでリサイズできます。ここでの操作はすべて右側のリストからキーボードでも行えます。',

    inspectorHeading: '編集',
    boxesHeading: 'ボックス一覧',
    emptyBoxes: 'ボックスがまだ検出されていません。ボックスを含む図を貼り付けるか、新しく追加してください。',
    editBox: 'ボックス「{label}」を編集',
    untitledBox: '無題のボックス',
    backToList: '一覧に戻る',

    geometryHeading: '位置とサイズ',
    xField: 'X',
    yField: 'Y',
    widthField: '幅',
    heightField: '高さ',
    textField: 'テキスト',
    deleteBoxAction: 'ボックスを削除',

    codeHeading: '図のテキスト',
    codeLabel: '図のテキスト',
    codeHint: '常にこのテキストが正です — ここでの編集は、入力が止まってから約300ミリ秒後にキャンバスへ反映されます。',

    outputHeading: '書き出し',
    copyText: 'テキストをコピー',
    copyForAI: 'AI指示用にコピー（before/after）',
    downloadTxt: '.txtをダウンロード',
    copied: 'クリップボードにコピーしました。',
    aiCopyIntro: 'UI構造を以下のbeforeからafterに変更してください。差分が変更指示です。',

    statsHeading: 'サマリー',
    statsBoxes: 'ボックス {count} 個を検出',
    statsHealed: '罫線の隙間 {count} 箇所を自動補正',
    statsSize: '{cols} × {rows} グリッド',

    installHeading: 'アプリを追加',
    installBody: 'ホーム画面に追加すると、すぐに開けます。',
    install: 'インストール',
    later: 'あとで',

    themeToLight: 'ライトモードに切り替え',
    themeToDark: 'ダークモードに切り替え',
    themeLabel: 'テーマ',

    close: '閉じる',
    required: '必須',
  },
  zh: {
    inputHeading: '粘贴一张示意图',
    inputSubtitle: '粘贴由 Unicode 制表符绘制的文本，或加载示例。',
    pasteLabel: '示意图文本',
    pastePlaceholder: '在此粘贴一张方框示意图，例如：\n┌───────┐\n│ hello │\n└───────┘',
    loadFromText: '加载',
    loadSample: '加载示例',

    addBoxAction: '添加方框',
    undo: '撤销',
    redo: '重做',
    reset: '重置',
    startOver: '粘贴其他示意图',
    resetConfirmTitle: '重置为粘贴时的版本？',
    resetConfirmBody: '这会丢弃加载此示意图后所做的全部修改，且无法撤销。',
    resetConfirmConfirm: '重置',
    resetConfirmCancel: '取消',
    startOverConfirmTitle: '粘贴其他示意图？',
    startOverConfirmBody: '这会丢弃当前示意图及其所有修改，且无法撤销。',
    startOverConfirmConfirm: '粘贴其他',
    startOverConfirmCancel: '取消',

    editorAria: '示意图编辑器',
    closeEditor: '关闭编辑器',
    moreOptions: '示意图工具与详情',

    canvasHeading: '画布',
    canvasAria: '方框示意图画布',
    canvasScrollAria: '画布滚动区域',
    canvasHint: '点击方框以选中，拖动以移动，拖动右下角以调整大小。这里的所有操作也可以通过右侧列表用键盘完成。',

    inspectorHeading: '编辑',
    boxesHeading: '方框列表',
    emptyBoxes: '尚未检测到方框。请粘贴包含方框的示意图，或新建一个。',
    editBox: '编辑方框「{label}」',
    untitledBox: '无标题方框',
    backToList: '返回列表',

    geometryHeading: '位置与大小',
    xField: 'X',
    yField: 'Y',
    widthField: '宽度',
    heightField: '高度',
    textField: '文本',
    deleteBoxAction: '删除方框',

    codeHeading: '示意图文本',
    codeLabel: '示意图文本',
    codeHint: '这里始终是唯一的源文本 — 停止输入约 300 毫秒后，画布会随之更新。',

    outputHeading: '导出',
    copyText: '复制文本',
    copyForAI: '复制给 AI（before/after）',
    downloadTxt: '下载 .txt',
    copied: '已复制到剪贴板。',
    aiCopyIntro: '请将 UI 结构从下面的 before 改为 after。差异即为修改指令。',

    statsHeading: '摘要',
    statsBoxes: '检测到 {count} 个方框',
    statsHealed: '已自动修补 {count} 处边框缺口',
    statsSize: '{cols} × {rows} 网格',

    installHeading: '安装应用',
    installBody: '添加到主屏幕，方便随时打开。',
    install: '安装',
    later: '以后再说',

    themeToLight: '切换到浅色模式',
    themeToDark: '切换到深色模式',
    themeLabel: '主题',

    close: '关闭',
    required: '必填',
  },
  de: {
    inputHeading: 'Ein Diagramm einfügen',
    inputSubtitle: 'Text aus Unicode-Rahmenzeichen einfügen oder das Beispiel laden.',
    pasteLabel: 'Diagrammtext',
    pastePlaceholder: 'Hier ein Kästchen-Diagramm einfügen, zum Beispiel:\n┌───────┐\n│ hello │\n└───────┘',
    loadFromText: 'Laden',
    loadSample: 'Beispiel laden',

    addBoxAction: 'Kästchen hinzufügen',
    undo: 'Rückgängig',
    redo: 'Wiederholen',
    reset: 'Zurücksetzen',
    startOver: 'Anderes Diagramm einfügen',
    resetConfirmTitle: 'Auf die eingefügte Version zurücksetzen?',
    resetConfirmBody:
      'Damit gehen alle Änderungen seit dem Laden dieses Diagramms verloren. Das lässt sich nicht rückgängig machen.',
    resetConfirmConfirm: 'Zurücksetzen',
    resetConfirmCancel: 'Abbrechen',
    startOverConfirmTitle: 'Anderes Diagramm einfügen?',
    startOverConfirmBody:
      'Damit gehen das aktuelle Diagramm und alle daran vorgenommenen Änderungen verloren. Das lässt sich nicht rückgängig machen.',
    startOverConfirmConfirm: 'Anderes einfügen',
    startOverConfirmCancel: 'Abbrechen',

    editorAria: 'Diagramm-Editor',
    closeEditor: 'Editor schließen',
    moreOptions: 'Diagrammwerkzeuge und Details',

    canvasHeading: 'Zeichenfläche',
    canvasAria: 'Zeichenfläche für das Kästchendiagramm',
    canvasScrollAria: 'Scrollbereich der Zeichenfläche',
    canvasHint:
      'Klicke auf ein Kästchen, um es auszuwählen, ziehe es zum Verschieben, oder ziehe an der unteren rechten Ecke, um es in der Größe zu ändern. Alles hier lässt sich auch über die Liste rechts per Tastatur erledigen.',

    inspectorHeading: 'Bearbeiten',
    boxesHeading: 'Kästchen',
    emptyBoxes: 'Noch keine Kästchen erkannt. Füge ein Diagramm mit einem Kästchen ein oder erstelle eins.',
    editBox: 'Kästchen „{label}“ bearbeiten',
    untitledBox: 'Kästchen ohne Text',
    backToList: 'Zurück zur Liste',

    geometryHeading: 'Position & Größe',
    xField: 'X',
    yField: 'Y',
    widthField: 'Breite',
    heightField: 'Höhe',
    textField: 'Text',
    deleteBoxAction: 'Kästchen löschen',

    codeHeading: 'Diagrammtext',
    codeLabel: 'Diagrammtext',
    codeHint:
      'Das ist immer die maßgebliche Quelle — Änderungen hier aktualisieren die Zeichenfläche etwa 300 ms nach dem letzten Tastendruck.',

    outputHeading: 'Export',
    copyText: 'Text kopieren',
    copyForAI: 'Für KI kopieren (Vorher/Nachher)',
    downloadTxt: '.txt herunterladen',
    copied: 'In die Zwischenablage kopiert.',
    aiCopyIntro: 'Ändere die UI-Struktur unten von „before“ zu „after“. Der Unterschied ist die Änderungsanweisung.',

    statsHeading: 'Zusammenfassung',
    statsBoxes: '{count} Kästchen erkannt',
    statsHealed: '{count} Randlücken automatisch geschlossen',
    statsSize: '{cols} × {rows} Raster',

    installHeading: 'App installieren',
    installBody: 'Zum Startbildschirm hinzufügen, um sie direkt zu öffnen.',
    install: 'Installieren',
    later: 'Später',

    themeToLight: 'Zum hellen Modus wechseln',
    themeToDark: 'Zum dunklen Modus wechseln',
    themeLabel: 'Design',

    close: 'Schließen',
    required: 'Erforderlich',
  },
  es: {
    inputHeading: 'Pega un diagrama',
    inputSubtitle: 'Pega texto hecho de caracteres de dibujo de cajas Unicode, o carga el ejemplo.',
    pasteLabel: 'Texto del diagrama',
    pastePlaceholder: 'Pega aquí un diagrama de cajas, por ejemplo:\n┌───────┐\n│ hello │\n└───────┘',
    loadFromText: 'Cargar',
    loadSample: 'Cargar ejemplo',

    addBoxAction: 'Añadir caja',
    undo: 'Deshacer',
    redo: 'Rehacer',
    reset: 'Restablecer',
    startOver: 'Pegar otro diagrama',
    resetConfirmTitle: '¿Restablecer a la versión pegada?',
    resetConfirmBody: 'Esto descarta todos los cambios hechos desde que se cargó este diagrama. No se puede deshacer.',
    resetConfirmConfirm: 'Restablecer',
    resetConfirmCancel: 'Cancelar',
    startOverConfirmTitle: '¿Pegar otro diagrama?',
    startOverConfirmBody: 'Esto descarta el diagrama actual y todos los cambios hechos en él. No se puede deshacer.',
    startOverConfirmConfirm: 'Pegar otro',
    startOverConfirmCancel: 'Cancelar',

    editorAria: 'Editor del diagrama',
    closeEditor: 'Cerrar el editor',
    moreOptions: 'Herramientas y detalles del diagrama',

    canvasHeading: 'Lienzo',
    canvasAria: 'Lienzo del diagrama de cajas',
    canvasScrollAria: 'Área de desplazamiento del lienzo',
    canvasHint:
      'Haz clic en una caja para seleccionarla, arrástrala para moverla, o arrastra su esquina inferior derecha para cambiar su tamaño. Todo esto también se puede hacer desde la lista de la derecha con el teclado.',

    inspectorHeading: 'Editar',
    boxesHeading: 'Cajas',
    emptyBoxes: 'Todavía no se detectó ninguna caja. Pega un diagrama que contenga una, o añade una.',
    editBox: 'Editar caja "{label}"',
    untitledBox: 'Caja sin texto',
    backToList: 'Volver a la lista',

    geometryHeading: 'Posición y tamaño',
    xField: 'X',
    yField: 'Y',
    widthField: 'Ancho',
    heightField: 'Alto',
    textField: 'Texto',
    deleteBoxAction: 'Eliminar caja',

    codeHeading: 'Texto del diagrama',
    codeLabel: 'Texto del diagrama',
    codeHint: 'Esto es siempre la fuente de verdad — los cambios aquí actualizan el lienzo unos 300 ms después de dejar de escribir.',

    outputHeading: 'Exportar',
    copyText: 'Copiar texto',
    copyForAI: 'Copiar para IA (antes/después)',
    downloadTxt: 'Descargar .txt',
    copied: 'Copiado al portapapeles.',
    aiCopyIntro:
      'Cambia la estructura de la interfaz del "before" (antes) al "after" (después) que aparecen abajo. La diferencia es la instrucción de cambio.',

    statsHeading: 'Resumen',
    statsBoxes: '{count} cajas detectadas',
    statsHealed: '{count} huecos en el borde rellenados automáticamente',
    statsSize: 'cuadrícula de {cols} × {rows}',

    installHeading: 'Instalar la app',
    installBody: 'Añádela a tu pantalla de inicio para tenerla siempre a mano.',
    install: 'Instalar',
    later: 'Más tarde',

    themeToLight: 'Cambiar al modo claro',
    themeToDark: 'Cambiar al modo oscuro',
    themeLabel: 'Tema',

    close: 'Cerrar',
    required: 'Obligatorio',
  },
} as const;

export type UiStrings = (typeof ui)['en'];
