### changelog.md

#### Completed Tasks
- [X] Bot buttons are working as expected.
- [X] Announcement generation processing works through GPT-3.5-Turbo.
- [X] Moderator listing is operational.
- [X] Message forwarding now works correctly to the moderation channel and announcement channel.
- [X] Generated or forwarded ready announce-message now offers options for further actions.
- [X] Fixed hallucination problems in message generation with previous conversations of the same ID (mentions were bugged).
- [X] Improved conversation view organization.
- [X] Responses to all user inputs have improved.
- [X] Support for English mode.
- [X] Moderator ability to edit and approve/reject announcements.
- [X] Mention of maintaining a sensible privacy policy.

#### Critical
- [ ] Update to GPT-4.
- [ ] Fix the /generate command to work correctly with empty input (variation).
- [ ] Fix the moderation channel to be functional.
- [ ] Implement a new ID system for messages (00001-99999).

#### Must-Do Tasks
- [ ] Improve user interaction after message generation, the text is very messy.
- [ ] Optimize bot response time and button functionality.
- [ ] Improve the /queue command view and functionality.
- [ ] Create a server-side library for sent and regenerated messages.
- [ ] Update calendar functionality.
- [ ] Add a better error handling system.

#### Nice-to-Have Features
- [ ] Prohibit responses to messages on channels.
- [ ] Provide a hint when a command is incorrect.
- [ ] Add ability to download the message library in superadmin mode.
- [ ] Add more formatting and emojis to the moderation view.
- [ ] Add a warning for moderators when the ID counter is approaching its maximum.
- [ ] Add a "message is being generated" notification.

#### Won't Fix
- The old frontend will be left as is.
- Code complexity. Can't do anything about it, imma a little teekkari vaan 👉👈