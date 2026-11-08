#!/usr/bin/env python3
import os

ode_to_joy = """<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE score-partwise PUBLIC
    "-//Recordare//DTD MusicXML 3.1 Partwise//EN"
    "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work>
    <work-title>Ode an die Freude (SATB)</work-title>
  </work>
  <identification>
    <creator type="composer">Ludwig van Beethoven</creator>
    <creator type="arranger">Übungssatz für 4 Stimmen</creator>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>Sopran</part-name>
      <score-instrument id="P1-I1">
        <instrument-name>Soprano</instrument-name>
      </score-instrument>
      <midi-instrument id="P1-I1">
        <midi-channel>1</midi-channel>
        <midi-program>53</midi-program>
      </midi-instrument>
    </score-part>
    <score-part id="P2">
      <part-name>Alt</part-name>
      <score-instrument id="P2-I1">
        <instrument-name>Alto</instrument-name>
      </score-instrument>
      <midi-instrument id="P2-I1">
        <midi-channel>2</midi-channel>
        <midi-program>53</midi-program>
      </midi-instrument>
    </score-part>
    <score-part id="P3">
      <part-name>Tenor</part-name>
      <score-instrument id="P3-I1">
        <instrument-name>Tenor</instrument-name>
      </score-instrument>
      <midi-instrument id="P3-I1">
        <midi-channel>3</midi-channel>
        <midi-program>53</midi-program>
      </midi-instrument>
    </score-part>
    <score-part id="P4">
      <part-name>Bass</part-name>
      <score-instrument id="P4-I1">
        <instrument-name>Bass</instrument-name>
      </score-instrument>
      <midi-instrument id="P4-I1">
        <midi-channel>4</midi-channel>
        <midi-program>53</midi-program>
      </midi-instrument>
    </score-part>
  </part-list>

  <!-- ==================== PART 1: SOPRAN ==================== -->
  <part id="P1">
    <!-- Takt 1 -->
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <direction placement="above">
        <direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>112</per-minute></metronome></direction-type>
        <sound tempo="112"/>
      </direction>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>Freu-</text></lyric></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>de,</text></lyric></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>schö-</text></lyric></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>ner</text></lyric></note>
    </measure>
    <!-- Takt 2 -->
    <measure number="2">
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>Göt-</text></lyric></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>ter-</text></lyric></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>fun-</text></lyric></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>ken,</text></lyric></note>
    </measure>
    <!-- Takt 3 -->
    <measure number="3">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>Toch-</text></lyric></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>ter</text></lyric></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>aus</text></lyric></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>E-</text></lyric></note>
    </measure>
    <!-- Takt 4 -->
    <measure number="4">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>6</duration><type>quarter</type><dot/><lyric><text>ly-</text></lyric></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>2</duration><type>eighth</type><lyric><text>si-</text></lyric></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>8</duration><type>half</type><lyric><text>um,</text></lyric></note>
    </measure>
    <!-- Takt 5 -->
    <measure number="5">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>wir</text></lyric></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>be-</text></lyric></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>tre-</text></lyric></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>ten</text></lyric></note>
    </measure>
    <!-- Takt 6 -->
    <measure number="6">
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>feu-</text></lyric></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>er-</text></lyric></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>trun-</text></lyric></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>ken,</text></lyric></note>
    </measure>
    <!-- Takt 7 -->
    <measure number="7">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>Himm-</text></lyric></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>li-</text></lyric></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>sche,</text></lyric></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>dein</text></lyric></note>
    </measure>
    <!-- Takt 8 -->
    <measure number="8">
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>6</duration><type>quarter</type><dot/><lyric><text>Hei-</text></lyric></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><type>eighth</type><lyric><text>lig-</text></lyric></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>8</duration><type>half</type><lyric><text>tum!</text></lyric></note>
    </measure>
  </part>

  <!-- ==================== PART 2: ALT ==================== -->
  <part id="P2">
    <!-- Takt 1 -->
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <!-- Takt 2 -->
    <measure number="2">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>B</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <!-- Takt 3 -->
    <measure number="3">
      <note><pitch><step>G</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>G</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>B</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <!-- Takt 4 -->
    <measure number="4">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>6</duration><type>quarter</type><dot/></note>
      <note><pitch><step>B</step><octave>3</octave></pitch><duration>2</duration><type>eighth</type></note>
      <note><pitch><step>B</step><octave>3</octave></pitch><duration>8</duration><type>half</type></note>
    </measure>
    <!-- Takt 5 -->
    <measure number="5">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <!-- Takt 6 -->
    <measure number="6">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>B</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <!-- Takt 7 -->
    <measure number="7">
      <note><pitch><step>G</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>G</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>B</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <!-- Takt 8 -->
    <measure number="8">
      <note><pitch><step>B</step><octave>3</octave></pitch><duration>6</duration><type>quarter</type><dot/></note>
      <note><pitch><step>A</step><octave>3</octave></pitch><duration>2</duration><type>eighth</type></note>
      <note><pitch><step>G</step><octave>3</octave></pitch><duration>8</duration><type>half</type></note>
    </measure>
  </part>

  <!-- ==================== PART 3: TENOR ==================== -->
  <part id="P3">
    <!-- Takt 1 -->
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line><clef-octave-change>-1</clef-octave-change></clef>
      </attributes>
      <note><pitch><step>G</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>G</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>A</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>B</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <!-- Takt 2 -->
    <measure number="2">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>A</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>G</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>F</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <!-- Takt 3 -->
    <measure number="3">
      <note><pitch><step>E</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>F</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>G</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <!-- Takt 4 -->
    <measure number="4">
      <note><pitch><step>G</step><octave>3</octave></pitch><duration>6</duration><type>quarter</type><dot/></note>
      <note><pitch><step>F</step><octave>3</octave></pitch><duration>2</duration><type>eighth</type></note>
      <note><pitch><step>F</step><octave>3</octave></pitch><duration>8</duration><type>half</type></note>
    </measure>
    <!-- Takt 5 -->
    <measure number="5">
      <note><pitch><step>G</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>G</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>A</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>B</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <!-- Takt 6 -->
    <measure number="6">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>A</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>G</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>F</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <!-- Takt 7 -->
    <measure number="7">
      <note><pitch><step>E</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>F</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>G</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <!-- Takt 8 -->
    <measure number="8">
      <note><pitch><step>F</step><octave>3</octave></pitch><duration>6</duration><type>quarter</type><dot/></note>
      <note><pitch><step>E</step><octave>3</octave></pitch><duration>2</duration><type>eighth</type></note>
      <note><pitch><step>E</step><octave>3</octave></pitch><duration>8</duration><type>half</type></note>
    </measure>
  </part>

  <!-- ==================== PART 4: BASS ==================== -->
  <part id="P4">
    <!-- Takt 1 -->
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>F</sign><line>4</line></clef>
      </attributes>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>F</step><octave>2</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>G</step><octave>2</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <!-- Takt 2 -->
    <measure number="2">
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>G</step><octave>2</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <!-- Takt 3 -->
    <measure number="3">
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>G</step><octave>2</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <!-- Takt 4 -->
    <measure number="4">
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>6</duration><type>quarter</type><dot/></note>
      <note><pitch><step>G</step><octave>2</octave></pitch><duration>2</duration><type>eighth</type></note>
      <note><pitch><step>G</step><octave>2</octave></pitch><duration>8</duration><type>half</type></note>
    </measure>
    <!-- Takt 5 -->
    <measure number="5">
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>F</step><octave>2</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>G</step><octave>2</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <!-- Takt 6 -->
    <measure number="6">
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>G</step><octave>2</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <!-- Takt 7 -->
    <measure number="7">
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>G</step><octave>2</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <!-- Takt 8 -->
    <measure number="8">
      <note><pitch><step>G</step><octave>2</octave></pitch><duration>6</duration><type>quarter</type><dot/></note>
      <note><pitch><step>C</step><octave>2</octave></pitch><duration>2</duration><type>eighth</type></note>
      <note><pitch><step>C</step><octave>2</octave></pitch><duration>8</duration><type>half</type></note>
    </measure>
  </part>
</score-partwise>
"""

bach_chorale = """<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE score-partwise PUBLIC
    "-//Recordare//DTD MusicXML 3.1 Partwise//EN"
    "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work>
    <work-title>O Haupt voll Blut und Wunden (BWV 244)</work-title>
  </work>
  <identification>
    <creator type="composer">Johann Sebastian Bach</creator>
    <creator type="arranger">Chorsatz (SATB)</creator>
  </identification>
  <part-list>
    <score-part id="P1"><part-name>Sopran</part-name></score-part>
    <score-part id="P2"><part-name>Alt</part-name></score-part>
    <score-part id="P3"><part-name>Tenor</part-name></score-part>
    <score-part id="P4"><part-name>Bass</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="0" implicit="yes">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>1</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <direction placement="above"><sound tempo="76"/></direction>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>O</text></lyric></note>
    </measure>
    <measure number="1">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>Haupt</text></lyric></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>voll</text></lyric></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>Blut</text></lyric></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>und</text></lyric></note>
    </measure>
    <measure number="2">
      <note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>8</duration><type>half</type><lyric><text>Wun-</text></lyric></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><notations><fermata/></notations><lyric><text>den,</text></lyric></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>voll</text></lyric></note>
    </measure>
    <measure number="3">
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>Schmerz</text></lyric></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>und</text></lyric></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>bit-</text></lyric></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><lyric><text>rer</text></lyric></note>
    </measure>
    <measure number="4">
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>12</duration><type>half</type><dot/><notations><fermata/></notations><lyric><text>Hohn,</text></lyric></note>
    </measure>
  </part>
  <part id="P2">
    <measure number="0" implicit="yes">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>1</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <measure number="1">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>D</step><alter>1</alter><octave>4</octave></pitch><duration>4</duration><type>quarter</type><accidental>sharp</accidental></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <measure number="2">
      <note><pitch><step>D</step><alter>1</alter><octave>4</octave></pitch><duration>8</duration><type>half</type></note>
      <note><pitch><step>B</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type><notations><fermata/></notations></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <measure number="3">
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <measure number="4">
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>12</duration><type>half</type><dot/><notations><fermata/></notations></note>
    </measure>
  </part>
  <part id="P3">
    <measure number="0" implicit="yes">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>1</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line><clef-octave-change>-1</clef-octave-change></clef>
      </attributes>
      <note><pitch><step>G</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <measure number="1">
      <note><pitch><step>G</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>F</step><alter>1</alter><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>B</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <measure number="2">
      <note><pitch><step>B</step><octave>3</octave></pitch><duration>8</duration><type>half</type></note>
      <note><pitch><step>G</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type><notations><fermata/></notations></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <measure number="3">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>D</step><alter>1</alter><octave>4</octave></pitch><duration>4</duration><type>quarter</type><accidental>sharp</accidental></note>
    </measure>
    <measure number="4">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>12</duration><type>half</type><dot/><notations><fermata/></notations></note>
    </measure>
  </part>
  <part id="P4">
    <measure number="0" implicit="yes">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>1</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>F</sign><line>4</line></clef>
      </attributes>
      <note><pitch><step>E</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <measure number="1">
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>B</step><octave>2</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <measure number="2">
      <note><pitch><step>B</step><octave>2</octave></pitch><duration>8</duration><type>half</type></note>
      <note><pitch><step>E</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type><notations><fermata/></notations></note>
      <note><pitch><step>E</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <measure number="3">
      <note><pitch><step>A</step><octave>2</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>G</step><octave>2</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>B</step><octave>2</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <measure number="4">
      <note><pitch><step>E</step><octave>3</octave></pitch><duration>12</duration><type>half</type><dot/><notations><fermata/></notations></note>
    </measure>
  </part>
</score-partwise>
"""

with open("src/samples/ode_to_joy.musicxml", "w", encoding="utf-8") as f:
    f.write(ode_to_joy)

with open("src/samples/bach_chorale.musicxml", "w", encoding="utf-8") as f:
    f.write(bach_chorale)

print("Generated sample musicxml files successfully.")
