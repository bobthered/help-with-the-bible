# Changes

- Add Lenis site-wide for gentle mouse-wheel momentum and smooth anchor navigation.
- Preserve native touch and nested scrolling, and honor reduced-motion preferences.
- Stop momentum before route changes, refresh scroll dimensions after navigation, and clean up Lenis on teardown.
- Include Lenis styles to prevent CSS smooth scrolling from competing with its animation; retain Tailwind smooth scrolling as a fallback.
