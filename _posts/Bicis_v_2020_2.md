---
title: Bicis v_2020_2
author: Javier de Martín
date: 2020-02-10
published: true
---

Introducing, after some months of delay, a new update of Bicis. It comes with little updates on the outside bug huge changes inside. I am so happy to add two new cities to the predictions platform and expand Neural Bikes to the world. I hope you can find this little big project as useful as I do and love it as much as I love spending time working on it.

What's new?

* Rewrote the app from the ground up, previous version was not very clean and kept me from releasing constant updates.
* New icon, that's always a good thing
* Ditched a half baked MVC implementation for MVVM, Coordinator Pattern & used ReactiveSwift. It might be a bit overkill but it's what I've learnt recently and wanted to use it.
* Worked **a lot** server-side. The predictions have considerately improved and that took a lot of time.
* Added Madrid and New York City! These two are two incredibly big services, each one with 200+ and 900+ bike stations. That presented a big bump from the 40 in Bilbao. I had to change some things in the map rendering to not damage the performance.
* I previously used CloudKit to serve the predictions. The app would access a public iCloud container with data for the app. I now have a public API that serves all of this.
* Created some beautiful [screenshots](https://twitter.com/javierdemartin/status/1226577748761731072) for the App Store using [fastlane](https://fastlane.tools).
* I have been debating myself whether staying with ads in the app or not. One part of me would like not to use them but I've spent way too much time on this and I'd like to see if I can shave some cents every month to keep me motivated. The web app of Neural Bikes has a different approach and presents a donation button to my Ko-Fi page. Only one individual donated 3€ (yay) and that made me crazy happy when I saw the email. Those are two different models 

![Bicis version 2020.2](https://javierdemart.in/_posts/resources/Bicis_v_2020_2.png)
