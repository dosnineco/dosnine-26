import os
import random
import pandas as pd
from dotenv import load_dotenv
import openai
import re

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

TOOLS_CSV = "/workspaces/romebybrand/expense_goose_1000_free_tool_ideas.csv"
OUTPUT_DIR = "/workspaces/romebybrand/pages/tools"

def slugify(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')

def prompt_template(tool_name):
    return f"""
Create a Next.js page component in TypeScript for a free personal finance tool called "{tool_name}".
Follow this structure:
Your task is to write a deeply original, human-sounding, 1500+ word content in First-person voice: (“I”, “my”, “you”). Professional yet conversational tone. Avoid robotic tone, exaggerated claims, or repetitive language. Helpful Content Compliance (Google): Ensure originality, avoid stuffing or repeating brand names too often. Post should be something someone would bookmark, share, and trust.
Use clean, semantic HTML inside React components.

Pages must follow a consistent layout: title (h1), description paragraph (p), section headings (h2/h3), and content (lists, FAQs, forms, tools).

Apply a max page width of max-w-screen-md, centered (mx-auto), and paddings px-4 py-8 for standard page spacing.

Use TailwindCSS for all styling. Prioritize readability:

Title: text-3xl font-bold text-center mb-6

Subheadings: text-2xl font-semibold mb-4 or text-xl font-semibold mb-4

Paragraphs: text-base text-gray-700 mb-4

Lists: list-disc list-inside mb-4 text-base

Always include SEO tags (<Head>) for every page: title, meta description, meta keywords, canonical link.

Add basic JSON-LD schema (where relevant), like SoftwareApplication or FAQPage markup.

Forms must use labeled inputs with accessible styling (larger clickable areas, clear contrast).

Components must prioritize mobile-first design (responsive padding, grid layout for larger screens, flex for small).

Include CTA buttons (px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600) with focus ring accessibility.

Use clear hierarchy (h1 > h2 > h3) without skipping heading levels for SEO.

Keep the color palette simple and accessible: mainly blue accents, white backgrounds, gray text for body copy.

Add a graph using recharts

Add a "Tips" section under results to increase engagement.
- Imports: React hooks, Head, recharts for charts, lucide-react for icons.
- Constants: Default categories/items relevant to the tool.
- Types: TypeScript types for user inputs.
- State: useState for user inputs, results, chart data, UI toggles.
- Handlers: Functions to update state, add/remove categories/items, calculate results, export CSV.
- Calculation logic: Implement main calculation for the tool.
- Chart data: Prepare data for a bar chart comparing user inputs and results.
- Export function: Allow users to export results as CSV.
- FAQ section: Add a list of FAQs about the tool.
- UI: Heading, description, form, results, chart, export button, tips, FAQ.
Redesign and refactor the following Next.js tool page component for improved usability, maintainability, and scalability.  
**Requirements:**
- Use functional React components and hooks.
- Organize code into logical sections: imports, constants, types, state, handlers, calculation logic, UI rendering.
- Modularize repeated UI elements (e.g., FAQ, tips, member forms) into separate components.
- Use clear naming conventions and concise comments.
- Ensure accessibility (ARIA labels, semantic HTML).
- Optimize for performance and readability.
- Add prop types or TypeScript interfaces for all components.
- Make it easy to add new features or categories in the future.
- **Apply Tailwind CSS classes for all UI elements** for a modern, responsive design.
- Return only the refactored code for the page, with all new components included in the same file or as suggested separate files.

Return only the code for the new tool as a Next.js page component, filename: /pages/tools/{slugify(tool_name)}.tsx
"""

def main():
    # Read CSV
    df = pd.read_csv(TOOLS_CSV)
    tool_ideas = df['Tool Idea'].dropna().tolist()

    # Ask how many to generate
    max_tools = len(tool_ideas)
    count = input(f"How many tool pages to generate? (max {max_tools}): ")
    try:
        count = int(count)
        if count < 1 or count > max_tools:
            raise ValueError
    except ValueError:
        print("Invalid number.")
        return

    # Pick random tool ideas
    selected = random.sample(tool_ideas, count)

    # Generate and write each tool page
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    for tool_name in selected:
        print(f"Generating: {tool_name}")
        prompt = prompt_template(tool_name)
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=3000,
            temperature=0.1,
        )
        content = response.choices[0].message.content
        # Extract code block
        match = re.search(r"`([\s\S]*?)````", content)
        code = match.group(1).strip() if match else content

        out_file = os.path.join(OUTPUT_DIR, f"{slugify(tool_name)}.tsx")
        with open(out_file, "w", encoding="utf-8") as f:
            f.write(code)
        print(f"Saved: {out_file}")

    print("Done!")

if __name__ == "__main__":
    main()