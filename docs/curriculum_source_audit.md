# Curriculum source audit

Four supplied PDFs are retained unchanged. Page numbers below refer to PDF pages, including cover/scheme pages.

| Document                                                       | Pages | SHA-256                                                          |
| -------------------------------------------------------------- | ----: | ---------------------------------------------------------------- |
| fy-2023.pdf                                                    |    60 | 3228c28371c0fbec1f395009107cc68543aab1c2f27ce4c2a5ccf8113508e627 |
| sy-2023.pdf                                                    |    64 | 6b5eb9eb0a4b2c61b8f0a7ae1115e79875dd213c238f444843ad4c8dac1bf3e3 |
| 1781009701_ty-2023-pattern-computer-engineering-merged (1).pdf |    65 | f46c4cc14b00198cbce5a634aee61d20bde804d4e527fa73c9320e45e54c40b2 |
| 1781009781_be-2023-syllabus-merged.pdf                         |    40 | af4a3ce945e492016038836e3a07822a7921246481d3684e868a6bce97bd7e9e |

All four files have readable text. FY pages 6/29 are semester dividers, not missing pages. Extraction involved table reading and visual checking of critical mappings and inconsistent headings. Some formulas and broken words remain subject to original-PDF review before assessment authoring. This is a reference import, not a faculty certification of every extracted character.

## Hierarchy and counts

Four academic years, eight semesters, 82 regular subject alternatives and seven conditional-exit entries: 89 source subject entries total. There are 85 detailed entries and four scheme-only exits, 303 numbered units, and source paragraph groups as topics. Elective alternatives are catalog entries, not all required in one student's load. FY common foundation subjects are included as supplied; they are not relabeled as department-specific algorithms subjects.

Semesters I/II: 7/8 regular subjects. III/IV: 10/10. V/VI: 14/14 including elective alternatives and labs. VII/VIII: 12/7 including alternatives. Exit entries have no semester assignment. Labs/activity courses with no numbered theory units retain source-page text rather than invented units.

## Missing and ambiguous details

- SY page 8 lists 2301221 Internship and 2301222 Graphic Designing; page 12 lists TY exits 2301321 Internship and 2301322 Video Editing. Detailed descriptions/linked external course material were not supplied.
- SY Democracy, Election and Governance pages 34–35 has Units I–III only; evaluation mentions IV/V. Those missing units were not invented.
- SY Foreign Language page 64 contains scheme/objective only, without a detailed topic list. Do not assume French/German topics from other curricula.
- BE Software Architecture and Design Patterns page 29 detail code is 23014010; BE page 2 scheme code is 2301410. SY embedded older final-year summary uses 2301411 and shifts subsequent semester VIII codes. Preserve the dedicated detail code and document variants; institutional confirmation is needed before assigning a canonical curriculum identifier.
- SY Data Structures page 42 says companion 2301214 Data Structures Lab, while the detailed lab is 2301215 and 2301214 is Java Programming Lab. Lab page 49 says companion 2301211 Data Structures, whereas theory is 2301212.
- FY Programming in C/Sports detail headings add FYE prefixes; store the observed headings and scheme code separately. Preserve the unusual supplied Probability & Statistics code 2300211A.
- Engineering Drawing's split “Unit III/IV” table headings required reconstruction against page 40. Digital Forensic has correctly numbered five units; an extraction artifact was removed, not treated as a source error.

## MVP module mapping

| Source reference                       | Verified topics                                                                                             | Release handling                                                                                                            |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| FY 2300118A Unit IV, p42               | Linear/binary search; insertion, exchange, selection sorting                                                | Four named MVP topics directly supported; preserve “exchange”, do not assume a synonym                                      |
| SY 2301214 Java Lab, p47               | Bubble and selection sorting                                                                                | MVP topic support; its Java interface assignment is not automatically equivalent to four-language generic practice          |
| SY 2301215 DS Lab, p51                 | Selection, bubble, insertion, shell, quick, radix                                                           | First three MVP; remaining algorithms future; source float-percentage assignment differs from integer visualizer input      |
| SY 2301212 Unit I, p42                 | Merge, quick, shell, radix; complexity                                                                      | Merge MVP; other algorithms future                                                                                          |
| TY HPC and Programming Lab, pp52–53/57 | Parallel bubble/merge                                                                                       | Sequential MVP is prerequisite material, not a parallel simulation                                                          |
| Other syllabus topics                  | Arrays, stacks, queues, trees, graphs, DP, OS/networking, ML, SQL, embedded systems, UI/UX, general studies | Reference catalog now; later reviewed content. SQL/network/hardware/GPU workloads are outside the four-language sandbox MVP |

No quizzes, coding problems, tests, learner records or scores are generated by this import. Every learning activity requires its own authored, reviewed, versioned content.
