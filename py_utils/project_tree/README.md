# 使用方式

1. 最简单用法：直接打印当前目录的项目树

~~~bash
python project_tree.py
~~~

或指定一个项目根目录：

~~~bash
python project_tree.py path/to/your/project
~~~

2. 使用忽略规则文件（类似 .gitignore）

比如在项目根目录下新建一个文件：.projignore，内容示例：

~~~txt
# 忽略虚拟环境和缓存
venv/
.env/
__pycache__/
*.pyc

# 忽略 git 目录
.git/

# 忽略构建产物
build/
dist/

# 忽略某个具体文件
secret_config.json

# 忽略根目录下的 logs 下所有内容（示例 / 开头）
/logs/*
~~~

然后运行：

~~~bash
python project_tree.py . -i .projignore
~~~

也可以直接用现有的 .gitignore：

~~~bash
python project_tree.py . -i .gitignore
~~~

注意：这里实现的是简化版 .gitignore 语法，支持常见的名字匹配和通配符（*、?），不支持所有高级规则（比如 ! 反选 等）。如果你想做得完全兼容 .gitignore，可以再往上叠一层专门的库（比如 pathspec）来匹配。