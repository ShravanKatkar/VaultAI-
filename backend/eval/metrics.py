import re

def lcs(x: list[str], y: list[str]) -> int:
    """
    Computes the length of the Longest Common Subsequence (LCS) between two lists of tokens.
    """
    m = len(x)
    n = len(y)
    
    # Standard dynamic programming approach with space optimization O(min(m, n))
    # We can use a 2-row table.
    if m < n:
        x, y = y, x
        m, n = n, m
        
    dp = [0] * (n + 1)
    
    for i in range(1, m + 1):
        prev = 0
        for j in range(1, n + 1):
            temp = dp[j]
            if x[i - 1] == y[j - 1]:
                dp[j] = prev + 1
            else:
                dp[j] = max(dp[j], dp[j - 1])
            prev = temp
            
    return dp[n]

def rouge_l_f1(reference: str, candidate: str) -> float:
    """
    Computes the sentence-level ROUGE-L F1 score between reference and candidate texts.
    ROUGE-L F1 is based on the Longest Common Subsequence of word tokens.
    """
    if not reference or not candidate:
        return 0.0
        
    # Tokenize by finding words and converting to lowercase
    ref_tokens = re.findall(r'\w+', reference.lower())
    cand_tokens = re.findall(r'\w+', candidate.lower())
    
    if not ref_tokens or not cand_tokens:
        return 0.0
        
    lcs_len = lcs(ref_tokens, cand_tokens)
    
    precision = lcs_len / len(cand_tokens)
    recall = lcs_len / len(ref_tokens)
    
    if precision + recall == 0:
        return 0.0
        
    f1 = (2 * precision * recall) / (precision + recall)
    return f1
