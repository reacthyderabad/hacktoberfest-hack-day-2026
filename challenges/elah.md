# Build on elah

**ELAHlabs • 2-hour Hack Day build**  
Hacktoberfest Hack Day • Hyderabad | MLH × DEV × React Hyderabad

Build an AI-powered, browser-based video editing experience on elah. Turn a user's intent into structured edits that can be previewed, accepted, rejected, or refined.

## Requirements from the final brief

- Use natural language as the starting point for an editing request.
- Represent the AI plan as structured editing data; the model should not directly manipulate pixels or the DOM.
- Validate the plan and apply only valid operations to the video timeline.
- Let the user preview the proposed changes before choosing what to keep.
- Support the user request → AI plan → preview → keep / discard / refine workflow.
- Make the complete AI action reversible in one step.
- Keep the scope focused enough to deliver a working experience in two hours and make the AI contribution visible in the demo.

## Idea directions

These examples are starting points, not fixed requirements. Combine them or build your own AI-powered editing workflow on elah while satisfying the requirements above.

| Direction | Idea |
| --- | --- |
| Brief → Reel | Turn a brief and a folder of assets into a short video using a structured build spec that the model corrects when validation fails. |
| Highlight Cut | Turn a longer talking-head recording into a shorter highlight cut with captions and one-step undo. |
| Conversational Editor | Translate requests to tighten a section, add a lower third, move a clip, or add a transition into safe structured operations. |
| Your Own Idea | Create another useful AI-powered editing workflow on elah. |

Example requests include “remove the first 10 seconds,” “put my name as a lower third at the start,” and “move this clip earlier and add a subtitle.” Requests must be expressible using your allowed operations.

## Suggested 120-minute build plan

| Minutes | Milestone | Output |
| --- | --- | --- |
| 0–15 | Choose your idea | One editing workflow and one user story |
| 15–30 | Get elah running | Editor/project loaded and first edit working |
| 30–70 | Build the AI loop | User request → structured edit plan |
| 70–105 | Make it useful | Validation, preview, undo, and refinement |
| 105–120 | Polish and demo | Working flow and a two-minute demo |

## Demo and submission evidence

Show the user request and AI-generated plan, then the resulting change in the editor. Demonstrate undo or discard for the complete AI action. Try an invalid or unsupported request and handle it cleanly. Explain in one sentence what makes the workflow useful.

## Resources

- [elah repository](https://github.com/elahlabs/elah)
- [Documentation](https://www.elah.dev/docs)
- [AI agents guide](https://www.elah.dev/docs/agents)

Source of challenge requirements: [Build on Elah](briefs/elah.pdf). The final brief replaces the earlier technical brief; its old package-version assumptions, five-hour milestones, fixed operation list, and option-specific metrics are not requirements of this final challenge.
