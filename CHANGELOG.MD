# Changes

- Animate elements already visible on page load or navigation after painting their starting state, while respecting reduced motion and keyboard focus.
- Slow entrance animations to 760 ms and stagger simultaneous reveals by 110 ms, with a capped delay for large groups.
- Reveal hero text, actions, and the reading preview separately through the root attachment.
- Delay scroll reveals until elements enter the viewport above a bottom inset equal to 20% of its height.
- Recalculate the reveal inset when the viewport resizes.
- Reveal visible pending elements at the end of the page so footer content cannot remain hidden below the trigger line.
- Extend motion tests to cover initial entrance timing, staggered batches, delayed reveals, viewport resizing, end-of-page content, reduced motion, and listener cleanup.
