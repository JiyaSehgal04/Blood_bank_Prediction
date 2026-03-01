import os
import json
import glob
import pandas as pd
from dotenv import load_dotenv
from openai import OpenAI
from PIL import Image
import base64
from tqdm import tqdm

# ----------------------------
# Load API Key
# ----------------------------
_script_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(_script_dir, ".env"))
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

MODEL = "gpt-5"

PROMPT = """
Extract this handwritten blood bank register page into structured JSON.

Each component (WB/PRC, PLT, FFP) must be a separate row.

Required fields:
- serial_no
- unit_no
- segment_no
- collection_datetime (YYYY-MM-DD HH:MM)
- component
- expiry_date (YYYY-MM-DD)
- quantity_ml (number only)
- blood_group (A+, O-, etc)
- hiv (Positive/Negative)
- hbsag (Positive/Negative)
- hcv (Positive/Negative)
- malaria (Positive/Negative)
- vdrl (Positive/Negative)

Rules:
- Convert "Neg" → "Negative"
- Convert "Pos" → "Positive"
- If unreadable → "UNCLEAR"
- Return ONLY valid JSON array.
"""

# ----------------------------
# Encode Image to Base64
# ----------------------------
def encode_image(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

# ----------------------------
# Extract Single Page
# ----------------------------
def extract_page(image_path):
    try:
        base64_image = encode_image(image_path)

        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": PROMPT},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            },
                        },
                    ],
                }
            ],
        )

        content = response.choices[0].message.content

        # 🔎 DEBUG: Print raw response once
        print("\n--- RAW MODEL OUTPUT ---")
        print(content[:1000])
        print("\n------------------------\n")

        # Extract JSON portion safely
        start = content.find("[")
        end = content.rfind("]")

        if start == -1 or end == -1:
            print("⚠ No JSON array detected.")
            return []

        json_text = content[start:end+1]

        return json.loads(json_text)

    except Exception as e:
        print(f"Error processing {image_path}: {e}")
        return []

        # Strip markdown code blocks (```json ... ``` or ``` ... ```)
        if "```" in content:
            parts = content.split("```")
            for p in parts:
                p = p.strip()
                if p.lower().startswith("json"):
                    p = p[4:].strip()
                if p.startswith("["):
                    content = p
                    break
            else:
                content = parts[1].strip()
                if content.lower().startswith("json"):
                    content = content[4:].strip()

        # If still no array at start, try to extract from response (e.g. "Here is the data: [...]")
        if not content.startswith("["):
            start = content.find("[")
            if start != -1:
                depth, end = 0, start
                for i, c in enumerate(content[start:], start):
                    if c == "[": depth += 1
                    elif c == "]": depth -= 1
                    if depth == 0:
                        end = i
                        break
                content = content[start : end + 1]

        if not content or "[" not in content:
            print(f"No JSON array in response for {image_path}")
            return []

        return json.loads(content)

    except json.JSONDecodeError as e:
        print(f"Invalid JSON from {image_path}: {e}")
        return []
    except Exception as e:
        print(f"Error processing {image_path}: {e}")
        return []

# ----------------------------
# Main
# ----------------------------
def main():
    script_dir = _script_dir
    search_dirs = [
        os.path.join(script_dir, "images"),
        os.path.join(script_dir, "..", "images"),
        script_dir,
    ]
    image_files = []
    for d in search_dirs:
        if os.path.isdir(d):
            image_files.extend(glob.glob(os.path.join(d, "*.[jJ][pP][gG]")))
            image_files.extend(glob.glob(os.path.join(d, "*.[jJ][pP][eE][gG]")))
            image_files.extend(glob.glob(os.path.join(d, "*.[pP][nN][gG]")))
    image_files = sorted(set(image_files))

    print(f"Found {len(image_files)} images.")

    all_rows = []
    for img_path in tqdm(image_files):
        rows = extract_page(img_path)
        all_rows.extend(rows)

    if not all_rows:
        print("No data extracted.")
        return

    df = pd.DataFrame(all_rows)
    output_dir = os.path.join(script_dir, "..", "outputs")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "MASTER_BLOOD_DATASET.xlsx")
    df.to_excel(output_path, index=False)

    print("Extraction complete.")
    print(f"Saved to {output_path}")

if __name__ == "__main__":
    main()