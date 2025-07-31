package com.privo

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class PrivoApplication

fun main(args: Array<String>) {
    runApplication<PrivoApplication>(*args)
}