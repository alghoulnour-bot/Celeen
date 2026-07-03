# Invite Video Script

Master style prompt to prepend to every scene when generating with an AI video tool:

> Luxury editorial wedding film. Soft ivory, champagne beige, warm candlelight, white roses, cream hydrangeas, delicate baby's breath with minimal olive greenery. Organic sculptural architecture inspired by modern luxury interiors. Glossy ivory floors with subtle reflections. Cinematic lighting. Dreamlike atmosphere. Elegant, timeless, romantic. No gold overload, no rustic elements, no dark colors, no ballroom recreation, no actual wedding venue. High-end fashion campaign aesthetic similar to Dior, Elie Saab, and Vogue Weddings. Slow cinematic camera movements, shallow depth of field, realistic textures, photorealistic, 4K, soft glow, luxurious minimalism.

## Scene 1 — first frame / poster image

A luxurious handmade ivory envelope rests on a soft beige textured surface surrounded by delicate white flowers and glowing candles. The envelope is sealed with an elegant wax seal featuring the initials "O & C." Soft floating dust particles catch the warm light. Ultra realistic luxury editorial style.

Overlay on this exact frame (used as the site's poster image, before any tap):

**"Tap to Open"**

This frame is exported as a still image and used as the poster for the video element on the website. The video itself starts playing only after the guest taps it — do not render the envelope opening automatically in this first frame.

## Scene 2

The wax seal gently breaks. The envelope slowly opens with graceful paper movement. Instead of revealing a letter, a warm glowing light pours from inside. The camera slowly moves into the envelope as it transforms into a dreamy ivory world made of sculptural architecture, candlelight, white flowers, soft reflections, and floating petals. Magical but elegant, not fantasy.

## Scene 3

The camera glides through a dreamlike landscape of ivory arches, soft beige walls, crystal details, candlelit pathways, and blooming white flowers. Elegant serif typography appears naturally within the space reading: "Welcome to the Wedding of Omar & Celeen." The text softly fades into the environment.

## Scene 4 — image-to-video, using the couple's engagement photo

Transform this couple into realistic moving characters while preserving their facial features. They smile naturally at each other, gently hold hands, and begin walking together through the elegant ivory dream world surrounded by candlelight and white florals. Their movements are subtle and graceful. The mood is romantic, cinematic, and timeless.

## Scene 5

The couple walks through beautiful sculptural gardens filled with white roses, cream flowers, floating petals, candlelight, crystal reflections, and elegant curved architecture. The camera follows behind them as warm sunlight mixes with soft candlelight.

## Scene 6

The flowers gently part as elegant floating typography appears:

> July 26, 2026
>
> Join us as we celebrate our forever.

The text slowly fades while candles flicker around it.

## Scene 7 — closing

The camera slowly pulls upward as thousands of candles illuminate the ivory dream world. White petals float through the air. Elegant typography appears one final time:

> We can't wait to celebrate with you.
>
> Omar & Celeen

Fade to ivory.

## Delivery

- Export the final cut as `invite-video.mp4` and place it in `public/assets/`.
- Export the Scene 1 still frame (with "Tap to Open" burned in, or left off if you'd rather have the site render the text — see `index.html`, `.envelope__tap`) if you want a real photographic envelope instead of the current CSS-drawn placeholder.
