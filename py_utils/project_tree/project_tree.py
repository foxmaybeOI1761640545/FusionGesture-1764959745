import os
import sys
import argparse
from pathlib import Path
from fnmatch import fnmatch

def load_ignore_patterns(ignore_file: Path | None):
    """
    从忽略规则文件中读取模式列表。
    忽略以 # 开头的注释行和空行。
    """
    patterns: list[str] = []
    if ignore_file is None:
        return patterns
    if not ignore_file.exists():
        print(f"[warning] ignore 文件 {ignore_file} 不存在，忽略该选项。", file=sys.stderr)
        return patterns
    with ignore_file.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            patterns.append(line)
    return patterns

def is_ignored(rel_path: str, patterns: list[str]) -> bool:
    """
    判断相对路径 rel_path 是否匹配忽略规则。
    rel_path 形如 "src/main.py"、"venv"、"venv/bin/activate"
    """
    # 统一为 Unix 风格路径，便于匹配
    rel_path_unix = rel_path.replace(os.sep, "/")
    name = os.path.basename(rel_path_unix)

    for p in patterns:
        p_unix = p.replace("\\", "/")
        # 处理以 / 结尾的目录模式（兼容 .gitignore 写法）
        if p_unix.endswith("/"):
            p_unix = p_unix.rstrip("/")

        # 以 / 开头：相对工程根目录的路径
        if p_unix.startswith("/"):
            pat = p_unix.lstrip("/")
            if fnmatch(rel_path_unix, pat):
                return True
        else:
            # 1) 匹配完整相对路径
            if fnmatch(rel_path_unix, p_unix):
                return True
            # 2) 匹配文件 / 文件夹名本身
            if fnmatch(name, p_unix):
                return True
    return False

def walk_tree(root: Path, patterns: list[str]):
    """
    深度优先遍历目录，生成 (path, is_dir, depth) 三元组。
    depth=0 是根目录本身。
    """
    root = root.resolve()
    stack = [(root, 0)]
    while stack:
        current, depth = stack.pop()
        rel = current.relative_to(root)
        rel_str = "." if rel == Path(".") else str(rel)
        # 根目录自身不参与忽略判断（方便输出），其他路径允许被忽略
        if depth != 0 and is_ignored(rel_str, patterns):
            continue

        yield current, current.is_dir(), depth

        if current.is_dir():
            # 子项排序：目录在前，文件在后，均按名称排序
            items = sorted(
                current.iterdir(),
                key=lambda p: (not p.is_dir(), p.name.lower()),
                reverse=True,  # 反向 + 栈 => 正向
            )
            for item in items:
                rel_child = item.relative_to(root)
                if is_ignored(str(rel_child), patterns):
                    continue
                stack.append((item, depth + 1))

def build_tree(root: Path, patterns: list[str]):
    """
    将遍历结果构造成一个嵌套字典，方便后续以树形打印。
    tree 结构示意：
    {
        'src': {
            'main.py': {},
            'utils': {
                '__init__.py': {}
            }
        },
        'README.md': {}
    }
    """
    tree: dict = {}

    for path, is_dir, depth in walk_tree(root, patterns):
        if path == root:
            continue  # 根目录在打印函数中单独处理
        rel = path.relative_to(root)
        parts = rel.parts
        node = tree
        for part in parts:
            node = node.setdefault(part, {})

    return tree

def print_tree(root: Path, patterns: list[str]):
    """
    控制台输出类似 tree 命令的项目目录结构。
    """
    root = root.resolve()
    tree = build_tree(root, patterns)

    def _print(node: dict, prefix: str = "", is_last: bool = True, name: str | None = None):
        connector = "└── " if is_last else "├── "
        if name is not None:
            print(prefix + connector + name)
            # 根据是否是本层最后一个节点决定后缀前缀
            prefix += "    " if is_last else "│   "

        # 对当前 node 的子项排序：目录在前，文件在后（通过是否有子字典简易区分）
        entries = sorted(node.items(), key=lambda kv: (len(kv[1]) == 0, kv[0].lower()))
        for i, (child_name, child_node) in enumerate(entries):
            last = i == len(entries) - 1
            _print(child_node, prefix, last, child_name)

    # 先打印根目录的绝对路径
    print(root)
    # 再打印一个 "." 作为根下占位
    _print(tree, "", True, ".")

def main():
    parser = argparse.ArgumentParser(
        description="输出指定文件夹的项目目录（支持类似 .gitignore 的忽略规则）"
    )
    parser.add_argument(
        "root",
        nargs="?",
        default=".",
        help="项目根目录（默认：当前目录）",
    )
    parser.add_argument(
        "-i", "--ignore-file",
        dest="ignore_file",
        help="忽略规则文件路径（类似 .gitignore），每行一个模式",
    )
    args = parser.parse_args()

    root = Path(args.root).expanduser().resolve()
    if not root.exists():
        print(f"错误：目录 {root} 不存在", file=sys.stderr)
        sys.exit(1)

    ignore_file = Path(args.ignore_file).expanduser().resolve() if args.ignore_file else None
    patterns = load_ignore_patterns(ignore_file)

    print_tree(root, patterns)

if __name__ == "__main__":
    main()
