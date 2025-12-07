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


def build_tree_string(root: Path, patterns: list[str]) -> str:
    """
    构造目录树字符串（供命令行打印或 GUI 文本框显示）。
    """
    root = root.resolve()
    tree = build_tree(root, patterns)
    lines: list[str] = []

    def _collect(node: dict, prefix: str = "", is_last: bool = True, name: str | None = None):
        connector = "└── " if is_last else "├── "
        if name is not None:
            lines.append(prefix + connector + name)
            # 根据是否是本层最后一个节点决定后缀前缀
            prefix_local = prefix + ("    " if is_last else "│   ")
        else:
            prefix_local = prefix

        # 对当前 node 的子项排序：目录在前，文件在后（通过是否有子字典简易区分）
        entries = sorted(node.items(), key=lambda kv: (len(kv[1]) == 0, kv[0].lower()))
        for i, (child_name, child_node) in enumerate(entries):
            last = i == len(entries) - 1
            _collect(child_node, prefix_local, last, child_name)

    # 先记录根目录的绝对路径
    lines.append(str(root))
    # 再记录一个 "." 作为根下占位
    _collect(tree, "", True, ".")

    return "\n".join(lines)


def print_tree(root: Path, patterns: list[str]):
    """
    控制台输出类似 tree 命令的项目目录结构。
    """
    tree_str = build_tree_string(root, patterns)
    print(tree_str)


def run_gui():
    """
    启动图形界面：
    - 选择/输入项目根目录
    - 输入额外忽略模式
    - 选择忽略规则文件
    - 选择要排除的具体文件/文件夹
    - 在文本框中显示目录树
    """
    try:
        import tkinter as tk
        from tkinter import filedialog, messagebox, scrolledtext
    except ImportError as e:
        print("错误：当前环境不支持 Tkinter，无法启动 GUI。", file=sys.stderr)
        raise

    app = tk.Tk()
    app.title("项目目录树生成器")

    # 变量
    root_var = tk.StringVar()
    ignore_file_var = tk.StringVar()
    exclude_paths: list[str] = []

    # ---- 行 0：根目录选择 ----
    frame_root = tk.Frame(app)
    frame_root.pack(fill="x", padx=8, pady=4)

    tk.Label(frame_root, text="项目根目录:").pack(side="left")
    entry_root = tk.Entry(frame_root, textvariable=root_var, width=50)
    entry_root.pack(side="left", padx=4, expand=True, fill="x")

    def choose_root():
        path = filedialog.askdirectory(title="选择项目根目录")
        if path:
            root_var.set(path)

    tk.Button(frame_root, text="浏览...", command=choose_root).pack(side="left")

    # ---- 行 1：忽略规则文件 ----
    frame_ignore_file = tk.Frame(app)
    frame_ignore_file.pack(fill="x", padx=8, pady=4)

    tk.Label(frame_ignore_file, text="忽略规则文件(可选):").pack(side="left")
    entry_ignore_file = tk.Entry(frame_ignore_file, textvariable=ignore_file_var, width=40)
    entry_ignore_file.pack(side="left", padx=4, expand=True, fill="x")

    def choose_ignore_file():
        path = filedialog.askopenfilename(
            title="选择忽略规则文件（类似 .gitignore）",
            filetypes=[("所有文件", "*.*")]
        )
        if path:
            ignore_file_var.set(path)

    tk.Button(frame_ignore_file, text="选择文件...", command=choose_ignore_file).pack(side="left")

    # ---- 行 2：额外忽略模式（多行文本）----
    frame_patterns = tk.Frame(app)
    frame_patterns.pack(fill="both", padx=8, pady=4)

    tk.Label(frame_patterns, text="额外忽略模式(每行一个，可选):").pack(anchor="w")
    patterns_text = scrolledtext.ScrolledText(frame_patterns, height=5)
    patterns_text.pack(fill="both", expand=False)

    # ---- 行 3：排除具体文件/文件夹 ----
    frame_exclude = tk.Frame(app)
    frame_exclude.pack(fill="both", padx=8, pady=4)

    tk.Label(frame_exclude, text="排除的文件/文件夹(可选):").pack(anchor="w")

    listbox_exclude = tk.Listbox(frame_exclude, height=4)
    listbox_exclude.pack(side="left", fill="both", expand=True)

    scrollbar_exclude = tk.Scrollbar(frame_exclude, orient="vertical", command=listbox_exclude.yview)
    scrollbar_exclude.pack(side="left", fill="y")
    listbox_exclude.config(yscrollcommand=scrollbar_exclude.set)

    btn_frame_exclude = tk.Frame(frame_exclude)
    btn_frame_exclude.pack(side="left", padx=4)

    def add_exclude_files():
        files = filedialog.askopenfilenames(title="选择要排除的文件")
        for f in files:
            if f not in exclude_paths:
                exclude_paths.append(f)
                listbox_exclude.insert(tk.END, f)

    def add_exclude_dir():
        d = filedialog.askdirectory(title="选择要排除的文件夹")
        if d and d not in exclude_paths:
            exclude_paths.append(d)
            listbox_exclude.insert(tk.END, d)

    def remove_selected_excludes():
        # 倒序删除避免 index 变化
        sel = list(listbox_exclude.curselection())
        sel.sort(reverse=True)
        for i in sel:
            path = listbox_exclude.get(i)
            listbox_exclude.delete(i)
            if path in exclude_paths:
                exclude_paths.remove(path)

    tk.Button(btn_frame_exclude, text="添加文件", command=add_exclude_files).pack(fill="x", pady=2)
    tk.Button(btn_frame_exclude, text="添加文件夹", command=add_exclude_dir).pack(fill="x", pady=2)
    tk.Button(btn_frame_exclude, text="移除选中", command=remove_selected_excludes).pack(fill="x", pady=2)

    # ---- 行 4：操作按钮 ----
    frame_buttons = tk.Frame(app)
    frame_buttons.pack(fill="x", padx=8, pady=4)

    # 结果文本框
    frame_output = tk.Frame(app)
    frame_output.pack(fill="both", padx=8, pady=4, expand=True)

    tk.Label(frame_output, text="目录树结果:").pack(anchor="w")
    output_text = scrolledtext.ScrolledText(frame_output, wrap="none", height=20)
    output_text.pack(fill="both", expand=True)

    def clear_output():
        output_text.delete("1.0", tk.END)

    def generate_tree():
        # 获取根目录
        root_str = root_var.get().strip()
        if not root_str:
            messagebox.showerror("错误", "请先输入或选择项目根目录。")
            return
        root_path = Path(root_str).expanduser()
        if not root_path.exists() or not root_path.is_dir():
            messagebox.showerror("错误", f"目录不存在或不是文件夹：{root_path}")
            return

        # 忽略规则文件
        ignore_file_str = ignore_file_var.get().strip()
        ignore_file_path: Path | None = None
        if ignore_file_str:
            ignore_file_path = Path(ignore_file_str).expanduser()
            if not ignore_file_path.exists():
                messagebox.showerror("错误", f"忽略规则文件不存在：{ignore_file_path}")
                return

        patterns: list[str] = []
        # 1) 从忽略规则文件读取
        patterns.extend(load_ignore_patterns(ignore_file_path))

        # 2) 从额外忽略模式文本框读取
        extra_text = patterns_text.get("1.0", tk.END)
        for line in extra_text.splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            patterns.append(line)

        # 3) 从“排除文件/文件夹”列表转换为相对路径模式
        root_resolved = root_path.resolve()
        for abs_p in exclude_paths:
            try:
                rel = Path(abs_p).resolve().relative_to(root_resolved)
            except Exception:
                # 不在根目录下则忽略
                continue
            rel_str = str(rel).replace(os.sep, "/")
            if rel_str not in patterns:
                patterns.append(rel_str)

        try:
            tree_str = build_tree_string(root_path, patterns)
        except Exception as e:
            messagebox.showerror("错误", f"生成目录树时出错：{e}")
            return

        clear_output()
        output_text.insert("1.0", tree_str)

    tk.Button(frame_buttons, text="生成目录树", command=generate_tree).pack(side="left", padx=4)
    tk.Button(frame_buttons, text="清空结果", command=clear_output).pack(side="left", padx=4)

    app.mainloop()


def main():
    """
    入口函数：
    - 若带有命令行参数：保持原有命令行行为
    - 若无命令行参数：启动 GUI
    """
    if len(sys.argv) == 1:
        # 没有额外参数，默认启动图形界面
        try:
            run_gui()
        except ImportError:
            # Tkinter 不可用时提示使用命令行
            print(
                "当前环境不支持 GUI，请使用命令行方式运行：\n"
                "  python project_tree.py <root> [-i IGNORE_FILE]",
                file=sys.stderr,
            )
            sys.exit(1)
        return

    # ====== 原有命令行逻辑 ======
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
