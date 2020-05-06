# Yajla

<center>

![](https://habrastorage.org/webt/z7/mv/h7/z7mvh7tuy65qnyyftvwmgbut-qk.png)

</center>

<center>
Yet another japanese learning app (hiragana / katakana)
</center>

__Features:__
- No pause button: auto-detect when time should not be counted  
- Persistent progress between updates & page reloads
- Auto difficulty scaling
- Minimalistic ui
- Very lite weight (only one dependency)

## How it works / rules

1. In the beginning program randomly picks from 5 first kana
2. Your first round is considered as a warm-up and does not affect any stats
3. Also, round will not affect any stats if any of the following conditions is met:            
 - input form focus is lost
 - answer is shown
 - answer took 7.5 seconds or more
 - this is the first round after page reload (warm-up)
4. The more time you've spent on particular kana on average, the more often it will occur          
4.1 _(--verbose)_ Exact weight is `3^(average_kana_time_in_ms/1200)`
5. The new kana always takes priority over the rest
6. Kana can not be picked twice in a row
7. If the average time of the last 50 rounds is below 1.2s, the level will increase every 10 rounds
