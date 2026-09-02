package com.gyansutra.app;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class AppConfigTest {

    @Test
    public void applicationIdIsStable() {
        assertEquals("com.gyansutra.app", BuildConfig.APPLICATION_ID);
    }
}
