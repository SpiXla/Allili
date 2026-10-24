# Allili

Allili turns a free-form list of tasks, deadlines, and habits into a time-blocked schedule using Google's Gemma 4 models.

## Demo and Screenshots

- **Live demo:** TODO - add the deployed app URL.
- **Planner screenshot:** TODO - add `docs/screenshots/planner.png`.
- **Generated schedule screenshot:** TODO - add `docs/screenshots/schedule.png`.

## Tech Stack

- Next.js 14 and React 18
- TypeScript and Tailwind CSS
- Google GenAI SDK with Gemma 4
- Zustand for schedule state
- Framer Motion for interface animations

## What It Does

- Organizes commitments into dated tasks with times, durations, categories, and priorities.
- Optionally rewrites a rough prompt before generating a schedule.
- Shows the schedule in calendar or agenda view. Tasks can be edited, removed, and marked complete.
- Exports the schedule as an `.ics` file for calendar apps.

## Prerequisites

- Node.js 18.17 or newer
- npm
- A Google AI Studio API key with access to the Gemini API

Create an API key at [Google AI Studio](https://aistudio.google.com/apikey).

## Run Locally

1. Install dependencies from the project root:

   ```bash
   npm install
   ```

2. Create `.env.local` in the project root and add your API key:

   ```env
   GEMINI_API_KEY=your_google_ai_studio_api_key
   ```

   Replace the example value with your key. Use the key exactly as provided; it must contain only ASCII characters. Keep `.env.local` private and never commit your API key.

3. Start the app:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000). If port 3000 is busy, Next.js prints the alternate local URL in the terminal.

## Use Allili

1. Enter your tasks, deadlines, available time, and habits in the prompt box. You can also load a sample prompt.
2. Optionally select **Optimize Prompt** to clarify and organize your input. Select **Undo** to restore the previous text.
3. Select **Generate Schedule** or press **Ctrl+Enter** (**Cmd+Enter** on macOS).
4. Review the generated calendar or agenda. Edit tasks, mark them complete, or remove them as needed.
5. Select **Export .ics** to download the schedule for your calendar app.

Schedules are held in the current app session and are not saved after a page refresh.

## Production Build

```bash
npm run build
npm start
```

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.