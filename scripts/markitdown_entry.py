import sys
import traceback

try:
    import pdfminer
    import pdfminer.high_level
    import pdfplumber
except Exception:
    traceback.print_exc()

from markitdown import MarkItDown

if len(sys.argv) != 2:
    sys.stderr.write("usage: markitdown <file>\n")
    sys.exit(2)

result = MarkItDown().convert(sys.argv[1])
sys.stdout.write(result.text_content)
