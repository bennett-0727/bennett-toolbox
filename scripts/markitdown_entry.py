from markitdown import MarkItDown
import sys

if len(sys.argv) != 2:
    sys.stderr.write("usage: markitdown <file>\n")
    sys.exit(2)

result = MarkItDown().convert(sys.argv[1])
sys.stdout.write(result.text_content)
