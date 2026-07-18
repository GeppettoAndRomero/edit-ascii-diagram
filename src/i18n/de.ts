import type { ToolContent } from './types';

// Deutsch. Keine Wort-für-Wort-Übersetzung, sondern eine an deutschen technischen
// Texten orientierte Formulierung. Keine Werbefloskeln (einfach / schnell /
// kinderleicht / perfekt) — Datenschutz wird strukturell, nicht als Versprechen
// dargestellt (BRAND-OPERATING-MODEL / I18N-SEO-GUIDELINE).

export const de: ToolContent = {
  htmlLang: 'de',

  meta: {
    title: 'Ein Unicode-Kästchendiagramm in einer GUI bearbeiten | runlocally',
    description:
      'Füge ein Diagramm aus Unicode-Rahmenzeichen (┌┐└┘│─) ein, bearbeite es per Klick-Auswahl, Ziehen und direkter Textbearbeitung, und exportiere es als sauberen Text zurück. Vollbreite japanische/chinesische Zeichen und Emoji werden korrekt als zwei Rasterspalten behandelt, sodass eingefügte Diagramme nicht verrutschen. Läuft vollständig im Browser.',
    ogTitle: 'Ein Unicode-Kästchendiagramm in einer GUI bearbeiten',
    ogDescription:
      'Ein Kästchendiagramm-Editor mit einem Raster, das Anzeigespalten korrekt zählt — vollbreite Zeichen und Emoji belegen zwei Spalten, sodass importierte Diagramme ausgerichtet bleiben. Läuft vollständig im Browser.',
  },

  hero: {
    h1: 'Kästchendiagramm bearbeiten',
    tagline:
      'Füge ein Unicode-Kästchendiagramm ein, bearbeite Kästchen per Klick und Ziehen (oder über ein vollständig per Tastatur bedienbares Formular) und exportiere sauberen Text zurück.',
  },

  intro: {
    h2: 'Ein Kästchendiagramm-Editor, der vollbreite Zeichen korrekt behandelt',
    paras: [
      'Dieses Tool liest ein Diagramm aus Unicode-Rahmenzeichen (┌┐└┘│─├┤┬┴┼) — verschachtelte rechteckige Kästchen, wie sie für UI-Wireframes und einfache Architekturskizzen verwendet werden —, lässt dich jedes Kästchen in einer GUI auswählen, verschieben, in der Größe ändern und neu betexten, und schreibt das Ergebnis als reinen Text zurück.',
      'Das Rastermodell adressiert jede Zelle nach Anzeigespalte, nicht nach UTF-16-Codeeinheit. Ein vollbreites japanisches oder chinesisches Zeichen oder ein Emoji (auch mehrteilige, mit einem Zero-Width-Joiner verbundene Sequenzen) belegt korrekt zwei Rasterspalten statt einer — beim Einfügen eines Diagramms, das ASCII mit CJK-Text oder Emoji-Symbolen mischt, bleiben die Kästchenränder deshalb ausgerichtet, statt nach dem ersten breiten Zeichen um eine oder zwei Spalten zu verrutschen.',
      'Es versteht ausschließlich verschachtelte rechteckige Kästchen — keine freihändigen Linien, Pfeile, Kreise oder sonstige ASCII-Art. Wer ein allgemeines Zeichenwerkzeug braucht, ist hier falsch; wer aber ein aus einem Designdokument oder einer Screenshot-Abschrift eingefügtes Kästchen-und-Label-Wireframe umbauen will, findet hier genau das passende Werkzeug.',
    ],
  },

  privacy: {
    h2: 'Warum dein Diagramm dein Gerät nie verlässt',
    lead: 'Datenschutz ist hier strukturell, kein Versprechen. Es gibt keinen Upload-Schritt, weil es keinen Server gibt, an den hochgeladen werden könnte:',
    points: [
      'Parsen, Bearbeiten und Rendern passieren vollständig im Browser.',
      'Die Seite wird als statische Datei ausgeliefert und stellt keine Anfrage, die deinen Diagrammtext enthält.',
      'Es gibt keine Link-Freigabefunktion, die dein Diagramm in eine URL kodieren würde.',
      'Der Quellcode ist offen einsehbar (MIT).',
      'Es funktioniert offline — das ist nur möglich, weil nichts das Gerät verlässt.',
    ],
    note: 'Wer das selbst überprüfen möchte: Öffne beim Bearbeiten das Netzwerk-Panel deines Browsers — keine Anfrage enthält deinen Diagrammtext.',
    sourceLinkText: 'Quellcode ansehen.',
  },

  howto: {
    h2: 'So wird es benutzt',
    steps: [
      {
        h3: 'Diagramm einfügen',
        p: 'Füge Kästchendiagramm-Text in das Textfeld ein oder klicke auf „Beispiel laden“, um es zuerst mit einem kleinen Beispiel auszuprobieren.',
      },
      {
        h3: 'Ein Kästchen auswählen und bearbeiten',
        p: 'Klicke auf ein Kästchen in der Zeichenfläche oder wähle es aus der Liste rechts. Ziehen verschiebt es, Ziehen an der unteren rechten Ecke ändert die Größe, und der Text lässt sich direkt im Formular bearbeiten — all das funktioniert auch über die Zahlenfelder und das Textfeld vollständig per Tastatur.',
      },
      {
        h3: 'Kästchen hinzufügen oder entfernen',
        p: '„Kästchen hinzufügen“ zeichnet ein neues leeres Kästchen, oder lösche das ausgewählte. Verschieben und Größenändern vermeiden nie Überlappungen mit anderen Kästchen — spätere Änderungen überschreiben einfach frühere, wie bei einer einfachen Zeichenfläche.',
      },
      {
        h3: 'Ergebnis exportieren',
        p: 'Kopiere den reinen Text, lade ihn als .txt-Datei herunter, oder nutze „Für KI kopieren“, um eine fertige Vorher/Nachher-Anweisung für einen KI-Chat zu erhalten (siehe unten).',
      },
    ],
  },

  faqHeading: 'FAQ',
  faq: [
    {
      q: 'Wird mein Diagramm irgendwohin hochgeladen?',
      a: 'Nein. Parsen, Bearbeiten und Rendern passieren vollständig im Browser. Es gibt keine Serverkomponente und keine Link-Freigabefunktion, sodass dein Diagrammtext keinen Weg vom Gerät hat.',
    },
    {
      q: 'Warum sind vollbreite Zeichen und Emoji hier wichtig?',
      a: 'Ein japanisches oder chinesisches Zeichen, oder die meisten Emoji, sind in einer Monospace-Schrift optisch doppelt so breit wie ein lateinischer Buchstabe — im zugrunde liegenden Text sind sie aber weiterhin nur ein Zeichen (bei manchen Emoji eine aus mehreren Codepunkten bestehende Sequenz). Ein Parser, der den Text Codeeinheit für Codeeinheit abläuft, verzählt sich bei dieser Breite, sodass der Kästchenrand nach dem breiten Zeichen eine Spalte zu früh endet. Dieses Tool berechnet die tatsächliche Anzeigebreite jedes Zeichens und gibt einem doppelt breiten Zeichen zwei Rasterspalten, sodass die Spalten unabhängig vom Diagramminhalt ausgerichtet bleiben.',
    },
    {
      q: 'Was passiert mit freihändigen Linien, Pfeilen oder Kreisen?',
      a: 'Dieses Tool erkennt und bearbeitet ausschließlich geschlossene rechteckige Bereiche aus den Standard-Rahmenzeichen (┌┐└┘│─├┤┬┴┼). Alles andere — eine diagonale Linie, eine Pfeilspitze, ein Kreis, allgemeine ASCII-Art — wird als gewöhnlicher Textinhalt unverändert übernommen, ist aber kein auswähl- oder verschiebbares Kästchen.',
    },
    {
      q: 'Vermeiden Verschieben oder Größenändern Überlappungen mit anderen Kästchen?',
      a: 'Nein, bewusst nicht. Das ist eine einfache Rasterzeichenfläche: Welches Kästchen du zuletzt zeichnest oder verschiebst, überschreibt einfach die Zellen, auf denen es landet — genau wie bei einem einfachen Zeichenwerkzeug. Überlappen sich zwei Kästchen am Ende, zeichne oder verschiebe eines davon neu, um es zu beheben.',
    },
    {
      q: 'Ist der exportierte Text byteidentisch mit dem Eingefügten, wenn ich nichts bearbeitet habe?',
      a: 'Nicht zwingend byteidentisch (nachgestellte Leerzeichen jeder Zeile werden zum Beispiel immer entfernt) — aber beim erneuten Parsen des exportierten Texts finden sich dieselben Kästchen an denselben Positionen mit demselben Text wie in der eingefügten Version. Das Tool ist eine vollständige Rasterzeichenfläche, kein zeilenerhaltender Patch-Editor.',
    },
    {
      q: 'Wofür ist „Für KI kopieren“?',
      a: 'Es kopiert den Diagrammtext so, wie er beim Einfügen war, und den aktuellen Text, als zwei beschriftete, eingerahmte Textblöcke, bereit zum Einfügen in einen KI-Chat als Änderungsanweisung. Das zielt auf einen bestimmten Workflow: ein UI-Wireframe (das Layout eines echten Bildschirms, skizziert als verschachtelte Kästchen) einfügen, hier bearbeiten und das Vorher/Nachher als Diff an eine KI übergeben.',
    },
    {
      q: 'Kann ich das ohne Maus benutzen?',
      a: 'Ja. Die Auswahl eines Kästchens aus der Liste sowie Verschieben, Größenändern, Text bearbeiten und Löschen über die Formularfelder neben der Zeichenfläche sind vollständig per Tastatur bedienbar. Das Ziehen auf der Zeichenfläche ist eine zusätzliche Komfortfunktion für die Maus, die auf denselben Operationen aufbaut.',
    },
    {
      q: 'Funktioniert es offline?',
      a: 'Ja. Es ist eine PWA. Nach dem ersten Besuch wird sie zwischengespeichert und funktioniert danach ohne Netzwerkverbindung. Du kannst sie auch auf deinem Startbildschirm installieren.',
    },
  ],

  footer: {
    openSourceLabel: 'Open Source (MIT)',
    partOf: 'Teil von',
    brandTail: '— kleine Tools, die lokal auf deinem Gerät laufen.',
    colophon:
      'Entwickelt und gepflegt von Geppetto. Ein Teil des Codes ist mit KI-Unterstützung entstanden; Review und Entscheidungen liegen vollständig beim Maintainer.',
    securityText: 'Sicherheit',
  },
};
