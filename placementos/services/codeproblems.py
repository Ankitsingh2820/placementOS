import json
from services.claude import get_client, MODEL

SEED_PROBLEMS = [
    {
        "id": "two-sum",
        "title": "Two Sum",
        "difficulty": "Easy",
        "topic": "Hash Maps",
        "description": "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input has exactly one solution, and you may not use the same element twice.",
        "examples": [
            {"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]", "explanation": "nums[0] + nums[1] = 2 + 7 = 9"},
            {"input": "nums = [3,2,4], target = 6", "output": "[1,2]", "explanation": "nums[1] + nums[2] = 2 + 4 = 6"},
        ],
        "constraints": ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "Exactly one valid answer exists"],
        "starter_code": {
            "python": "def twoSum(nums, target):\n    pass",
            "javascript": "function twoSum(nums, target) {\n\n}",
            "cpp": "#include<vector>\nusing namespace std;\n\nvector<int> twoSum(vector<int>& nums, int target) {\n\n}",
        },
    },
    {
        "id": "valid-parentheses",
        "title": "Valid Parentheses",
        "difficulty": "Easy",
        "topic": "Stacks",
        "description": "Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\nAn input string is valid if:\n- Open brackets must be closed by the same type of brackets.\n- Open brackets must be closed in the correct order.\n- Every close bracket has a corresponding open bracket of the same type.",
        "examples": [
            {"input": 's = "()"', "output": "true", "explanation": ""},
            {"input": 's = "()[]{}"', "output": "true", "explanation": ""},
            {"input": 's = "(]"', "output": "false", "explanation": ""},
        ],
        "constraints": ["1 <= s.length <= 10^4", "s consists of parentheses only '()[]{}'"],
        "starter_code": {
            "python": "def isValid(s):\n    pass",
            "javascript": "function isValid(s) {\n\n}",
            "cpp": "#include<string>\nusing namespace std;\n\nbool isValid(string s) {\n\n}",
        },
    },
    {
        "id": "max-subarray",
        "title": "Maximum Subarray",
        "difficulty": "Medium",
        "topic": "Dynamic Programming",
        "description": "Given an integer array `nums`, find the subarray with the largest sum, and return its sum.\n\nA subarray is a contiguous non-empty sequence of elements within an array.",
        "examples": [
            {"input": "nums = [-2,1,-3,4,-1,2,1,-5,4]", "output": "6", "explanation": "The subarray [4,-1,2,1] has the largest sum 6."},
            {"input": "nums = [1]", "output": "1", "explanation": ""},
            {"input": "nums = [5,4,-1,7,8]", "output": "23", "explanation": "The subarray [5,4,-1,7,8] has the largest sum 23."},
        ],
        "constraints": ["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"],
        "starter_code": {
            "python": "def maxSubArray(nums):\n    pass",
            "javascript": "function maxSubArray(nums) {\n\n}",
            "cpp": "#include<vector>\nusing namespace std;\n\nint maxSubArray(vector<int>& nums) {\n\n}",
        },
    },
    {
        "id": "climbing-stairs",
        "title": "Climbing Stairs",
        "difficulty": "Easy",
        "topic": "Dynamic Programming",
        "description": "You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb `1` or `2` steps. In how many distinct ways can you climb to the top?",
        "examples": [
            {"input": "n = 2", "output": "2", "explanation": "Two ways: 1+1 or 2"},
            {"input": "n = 3", "output": "3", "explanation": "Three ways: 1+1+1, 1+2, or 2+1"},
        ],
        "constraints": ["1 <= n <= 45"],
        "starter_code": {
            "python": "def climbStairs(n):\n    pass",
            "javascript": "function climbStairs(n) {\n\n}",
            "cpp": "int climbStairs(int n) {\n\n}",
        },
    },
    {
        "id": "reverse-linked-list",
        "title": "Reverse Linked List",
        "difficulty": "Easy",
        "topic": "Linked Lists",
        "description": "Given the `head` of a singly linked list, reverse the list, and return the reversed list.",
        "examples": [
            {"input": "head = [1,2,3,4,5]", "output": "[5,4,3,2,1]", "explanation": ""},
            {"input": "head = [1,2]", "output": "[2,1]", "explanation": ""},
            {"input": "head = []", "output": "[]", "explanation": ""},
        ],
        "constraints": ["The number of nodes is in the range [0, 5000]", "-5000 <= Node.val <= 5000"],
        "starter_code": {
            "python": "class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef reverseList(head):\n    pass",
            "javascript": "function reverseList(head) {\n\n}",
            "cpp": "struct ListNode {\n    int val;\n    ListNode *next;\n    ListNode(int x) : val(x), next(NULL) {}\n};\n\nListNode* reverseList(ListNode* head) {\n\n}",
        },
    },
    {
        "id": "longest-substring",
        "title": "Longest Substring Without Repeating Characters",
        "difficulty": "Medium",
        "topic": "Sliding Window",
        "description": "Given a string `s`, find the length of the longest substring without repeating characters.",
        "examples": [
            {"input": 's = "abcabcbb"', "output": "3", "explanation": 'The answer is "abc", with length 3.'},
            {"input": 's = "bbbbb"', "output": "1", "explanation": 'The answer is "b", with length 1.'},
            {"input": 's = "pwwkew"', "output": "3", "explanation": 'The answer is "wke", with length 3.'},
        ],
        "constraints": ["0 <= s.length <= 5 * 10^4", "s consists of English letters, digits, symbols and spaces"],
        "starter_code": {
            "python": "def lengthOfLongestSubstring(s):\n    pass",
            "javascript": "function lengthOfLongestSubstring(s) {\n\n}",
            "cpp": "#include<string>\nusing namespace std;\n\nint lengthOfLongestSubstring(string s) {\n\n}",
        },
    },
    {
        "id": "number-of-islands",
        "title": "Number of Islands",
        "difficulty": "Medium",
        "topic": "Graphs",
        "description": "Given an `m x n` 2D binary grid which represents a map of `'1'`s (land) and `'0'`s (water), return the number of islands.\n\nAn island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.",
        "examples": [
            {"input": 'grid = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]', "output": "1", "explanation": ""},
            {"input": 'grid = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]', "output": "3", "explanation": ""},
        ],
        "constraints": ["m == grid.length", "n == grid[i].length", "1 <= m, n <= 300", "grid[i][j] is '0' or '1'"],
        "starter_code": {
            "python": "def numIslands(grid):\n    pass",
            "javascript": "function numIslands(grid) {\n\n}",
            "cpp": "#include<vector>\n#include<string>\nusing namespace std;\n\nint numIslands(vector<vector<char>>& grid) {\n\n}",
        },
    },
    {
        "id": "binary-search",
        "title": "Binary Search",
        "difficulty": "Easy",
        "topic": "Searching",
        "description": "Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, return its index. Otherwise, return `-1`.\n\nYou must write an algorithm with `O(log n)` runtime complexity.",
        "examples": [
            {"input": "nums = [-1,0,3,5,9,12], target = 9", "output": "4", "explanation": "9 exists at index 4"},
            {"input": "nums = [-1,0,3,5,9,12], target = 2", "output": "-1", "explanation": "2 does not exist"},
        ],
        "constraints": ["1 <= nums.length <= 10^4", "-10^4 < nums[i], target < 10^4", "All integers in nums are unique", "nums is sorted in ascending order"],
        "starter_code": {
            "python": "def search(nums, target):\n    pass",
            "javascript": "function search(nums, target) {\n\n}",
            "cpp": "#include<vector>\nusing namespace std;\n\nint search(vector<int>& nums, int target) {\n\n}",
        },
    },
    {
        "id": "best-time-stocks",
        "title": "Best Time to Buy and Sell Stock",
        "difficulty": "Easy",
        "topic": "Arrays",
        "description": "You are given an array `prices` where `prices[i]` is the price of a given stock on the `i`th day.\n\nYou want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.\n\nReturn the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return `0`.",
        "examples": [
            {"input": "prices = [7,1,5,3,6,4]", "output": "5", "explanation": "Buy on day 2 (price=1), sell on day 5 (price=6). Profit = 6-1 = 5."},
            {"input": "prices = [7,6,4,3,1]", "output": "0", "explanation": "No profit possible."},
        ],
        "constraints": ["1 <= prices.length <= 10^5", "0 <= prices[i] <= 10^4"],
        "starter_code": {
            "python": "def maxProfit(prices):\n    pass",
            "javascript": "function maxProfit(prices) {\n\n}",
            "cpp": "#include<vector>\nusing namespace std;\n\nint maxProfit(vector<int>& prices) {\n\n}",
        },
    },
    {
        "id": "valid-palindrome",
        "title": "Valid Palindrome",
        "difficulty": "Easy",
        "topic": "Strings",
        "description": "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.\n\nGiven a string `s`, return `true` if it is a palindrome, or `false` otherwise.",
        "examples": [
            {"input": 's = "A man, a plan, a canal: Panama"', "output": "true", "explanation": '"amanaplanacanalpanama" is a palindrome.'},
            {"input": 's = "race a car"', "output": "false", "explanation": '"raceacar" is not a palindrome.'},
        ],
        "constraints": ["1 <= s.length <= 2 * 10^5", "s consists only of printable ASCII characters"],
        "starter_code": {
            "python": "def isPalindrome(s):\n    pass",
            "javascript": "function isPalindrome(s) {\n\n}",
            "cpp": "#include<string>\nusing namespace std;\n\nbool isPalindrome(string s) {\n\n}",
        },
    },
    {
        "id": "merge-intervals",
        "title": "Merge Intervals",
        "difficulty": "Medium",
        "topic": "Sorting",
        "description": "Given an array of `intervals` where `intervals[i] = [starti, endi]`, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.",
        "examples": [
            {"input": "intervals = [[1,3],[2,6],[8,10],[15,18]]", "output": "[[1,6],[8,10],[15,18]]", "explanation": "Intervals [1,3] and [2,6] overlap, merged to [1,6]."},
            {"input": "intervals = [[1,4],[4,5]]", "output": "[[1,5]]", "explanation": "Intervals [1,4] and [4,5] are overlapping."},
        ],
        "constraints": ["1 <= intervals.length <= 10^4", "intervals[i].length == 2", "0 <= starti <= endi <= 10^4"],
        "starter_code": {
            "python": "def merge(intervals):\n    pass",
            "javascript": "function merge(intervals) {\n\n}",
            "cpp": "#include<vector>\nusing namespace std;\n\nvector<vector<int>> merge(vector<vector<int>>& intervals) {\n\n}",
        },
    },
    {
        "id": "lru-cache",
        "title": "LRU Cache",
        "difficulty": "Hard",
        "topic": "Design",
        "description": "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.\n\nImplement the `LRUCache` class:\n- `LRUCache(int capacity)` Initialize with positive size `capacity`.\n- `int get(int key)` Return the value if key exists, otherwise return `-1`.\n- `void put(int key, int value)` Update the value if key exists. Otherwise, add the key-value pair. If the number of keys exceeds capacity, evict the LRU key.\n\nBoth operations must run in `O(1)` average time.",
        "examples": [
            {"input": '["LRUCache","put","put","get","put","get","put","get","get","get"]\n[[2],[1,1],[2,2],[1],[3,3],[2],[4,4],[1],[3],[4]]', "output": "[null,null,null,1,null,-1,null,-1,3,4]", "explanation": ""},
        ],
        "constraints": ["1 <= capacity <= 3000", "0 <= key <= 10^4", "0 <= value <= 10^5", "At most 2 * 10^5 calls to get and put"],
        "starter_code": {
            "python": "class LRUCache:\n    def __init__(self, capacity):\n        pass\n\n    def get(self, key):\n        pass\n\n    def put(self, key, value):\n        pass",
            "javascript": "class LRUCache {\n    constructor(capacity) {\n\n    }\n\n    get(key) {\n\n    }\n\n    put(key, value) {\n\n    }\n}",
            "cpp": "#include<unordered_map>\n#include<list>\nusing namespace std;\n\nclass LRUCache {\npublic:\n    LRUCache(int capacity) {\n\n    }\n\n    int get(int key) {\n\n    }\n\n    void put(int key, int value) {\n\n    }\n};",
        },
    },
]

EVALUATE_PROMPT = """\
You are a senior software engineer conducting a coding interview. Evaluate this solution.

Problem: {title}
Difficulty: {difficulty}
Topic: {topic}

Problem Description:
{description}

Candidate's {language} solution:
```
{code}
```

Return ONLY valid JSON (no markdown, no explanation outside JSON):
{{
  "verdict": "Accepted" | "Partially Correct" | "Wrong Approach" | "Incomplete",
  "score": <0-100 integer>,
  "correctness": "<1-2 sentences on whether the logic is correct>",
  "time_complexity": "<e.g. O(n) — brief explanation>",
  "space_complexity": "<e.g. O(1) — brief explanation>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "interviewer_note": "<1-2 sentences on what an interviewer would think>",
  "optimal_hint": "<One sentence hinting at the optimal approach if their solution isn't optimal>"
}}
"""

HINT_PROMPT = """\
Problem: {title}
{description}

The candidate is stuck. Their current {language} code:
```
{code}
```

Give ONE helpful hint (2-3 sentences) that nudges them toward the right approach WITHOUT giving away the solution.
Be encouraging. Focus on the key insight they're missing.
Return ONLY the hint text, no JSON, no labels.
"""

GENERATE_PROMPT = """\
Generate 6 coding interview problems tailored for a {role} position at a tech company.
Mix difficulties: 2 Easy, 3 Medium, 1 Hard.
Focus on topics relevant to the role.

Return ONLY a valid JSON array with this exact structure (no markdown):
[
  {{
    "id": "<kebab-case-slug>",
    "title": "<Problem Title>",
    "difficulty": "Easy" | "Medium" | "Hard",
    "topic": "<Arrays|Strings|Trees|DP|Graphs|Hash Maps|Sorting|Sliding Window|Design>",
    "description": "<Full problem description with newlines as \\n>",
    "examples": [
      {{"input": "<input>", "output": "<output>", "explanation": "<explanation or empty string>"}}
    ],
    "constraints": ["<constraint 1>", "<constraint 2>"],
    "starter_code": {{
      "python": "<python starter code>",
      "javascript": "<js starter code>",
      "cpp": "<cpp starter code>"
    }}
  }}
]
"""


async def get_problems(job: dict | None = None) -> list:
    if not job:
        return SEED_PROBLEMS
    role = f"{job.get('title', '')} at {job.get('company', '')}"
    client = get_client()
    try:
        resp = await client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": GENERATE_PROMPT.format(role=role)}],
            max_tokens=3000,
        )
        raw = resp.choices[0].message.content.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        problems = json.loads(raw)
        return problems if isinstance(problems, list) else SEED_PROBLEMS
    except Exception:
        return SEED_PROBLEMS


async def evaluate_solution(problem: dict, code: str, language: str) -> dict:
    prompt = EVALUATE_PROMPT.format(
        title=problem["title"],
        difficulty=problem["difficulty"],
        topic=problem["topic"],
        description=problem["description"],
        language=language,
        code=code,
    )
    client = get_client()
    resp = await client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=800,
    )
    raw = resp.choices[0].message.content.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()
    return json.loads(raw)


async def get_hint(problem: dict, code: str, language: str) -> str:
    prompt = HINT_PROMPT.format(
        title=problem["title"],
        description=problem["description"],
        language=language,
        code=code or "# (no code written yet)",
    )
    client = get_client()
    resp = await client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=200,
    )
    return resp.choices[0].message.content.strip()
